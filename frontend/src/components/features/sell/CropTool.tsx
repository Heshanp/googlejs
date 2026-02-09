'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Transformer, Path, Group, Circle, Line } from 'react-konva';
import Konva from 'konva';
import { RotateCw, Move } from 'lucide-react';
import { Area } from 'react-easy-crop';
import { cn } from '../../../lib/utils';
import { getImageDimensions, rotateSize } from '../../../utils/imageEditorUtils';

interface CropToolProps {
    imageSrc: string;
    onCropComplete: (croppedAreaPixels: Area) => void;
    rotation: number;
    onRotationChange: (rotation: number) => void;
}

export const CropTool: React.FC<CropToolProps> = ({
    imageSrc,
    onCropComplete,
    rotation,
    onRotationChange,
}) => {
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [scale, setScale] = useState(1);

    // Crop rect in Stage coordinates
    const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [isRotating, setIsRotating] = useState(false);

    // Initial setup
    useEffect(() => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = imageSrc;
        img.onload = () => {
            setImage(img);
            setImageSize({ width: img.width, height: img.height });
        };
    }, [imageSrc]);

    // Handle container resize
    useEffect(() => {
        const updateSize = () => {
            const container = stageRef.current?.container();
            if (container) {
                const parent = container.parentElement;
                if (parent) {
                    setStageSize({
                        width: parent.offsetWidth,
                        height: parent.offsetHeight
                    });
                }
            }
        };
        window.addEventListener('resize', updateSize);
        updateSize();
        // Initial size check
        setTimeout(updateSize, 100);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Effect to calculate scale and initial crop
    useEffect(() => {
        if (!imageSize.width || !stageSize.width) return;

        // Calculate fit scale
        const padding = 40;
        const availableW = stageSize.width - padding * 2;
        const availableH = stageSize.height - padding * 2;

        const scaleX = availableW / imageSize.width;
        const scaleY = availableH / imageSize.height;
        const newScale = Math.min(scaleX, scaleY, 1);

        setScale(newScale);

        // Center image
        const imgDisplayW = imageSize.width * newScale;
        const imgDisplayH = imageSize.height * newScale;

        // Initialize crop rect to 90% of image
        if (cropRect.width === 0) {
            setCropRect({
                x: (stageSize.width - imgDisplayW) / 2 + (imgDisplayW * 0.05),
                y: (stageSize.height - imgDisplayH) / 2 + (imgDisplayH * 0.05),
                width: imgDisplayW * 0.9,
                height: imgDisplayH * 0.9,
            });
        }
    }, [imageSize, stageSize]);

    // Update transformer when crop rect is ready
    useEffect(() => {
        if (transformerRef.current && stageRef.current) {
            const cropNode = stageRef.current.findOne('#crop-rect');
            if (cropNode) {
                transformerRef.current.nodes([cropNode]);
                transformerRef.current.getLayer()?.batchDraw();
            }
        }
    }, [cropRect]);

    // Calculate crop output whenever Rect Or Rotation changes
    useEffect(() => {
        if (!imageSize.width) return;

        // Visual Bounding Box of Rotated Image
        // rotateSize returns the size of the BB for the original Dimensions rotated
        const bBox = rotateSize(imageSize.width, imageSize.height, rotation);

        // Scale to stage visual size
        const bBoxDisplayW = bBox.width * scale;
        const bBoxDisplayH = bBox.height * scale;

        // Visual center of image on stage
        const cx = stageSize.width / 2;
        const cy = stageSize.height / 2;

        // Top-left of the Rotated BBox in Stage Coords
        const visualX = cx - bBoxDisplayW / 2;
        const visualY = cy - bBoxDisplayH / 2;

        // Calculate Pixel Crop relative to Rotated BBox (unscaled)
        const pixelCrop: Area = {
            x: Math.max(0, (cropRect.x - visualX) / scale),
            y: Math.max(0, (cropRect.y - visualY) / scale),
            width: cropRect.width / scale,
            height: cropRect.height / scale,
        };

        // Ensure valid values
        onCropComplete(pixelCrop);

    }, [cropRect, rotation, scale, imageSize, stageSize, onCropComplete]);


    // Helper to generate the "Hole" path (Dimmer)
    const overlayPath = useMemo(() => {
        if (!stageSize.width) return '';
        // Outer rectangle (Stage)
        const outer = `M 0 0 L ${stageSize.width} 0 L ${stageSize.width} ${stageSize.height} L 0 ${stageSize.height} Z`;
        // Inner rectangle (Crop - Counter Clockwise for hole)
        const inner = `M ${cropRect.x} ${cropRect.y} L ${cropRect.x} ${cropRect.y + cropRect.height} L ${cropRect.x + cropRect.width} ${cropRect.y + cropRect.height} L ${cropRect.x + cropRect.width} ${cropRect.y} Z`;
        return `${outer} ${inner}`;
    }, [stageSize, cropRect]);

    const handleRotationDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
        // Calculate angle based on center of crop rect
        const cx = cropRect.x + cropRect.width / 2;
        const cy = cropRect.y + cropRect.height / 2;

        const pos = e.target.getStage()?.getPointerPosition();
        if (!pos) return;

        // Calculate angle
        const dx = pos.x - cx;
        const dy = pos.y - cy;
        // At 0 rotation, handle is at bottom (90 deg usually). 
        // atan2(dy, dx) gives angle in radians from X axis.
        // We want rotation relative to vertical Y axis being 0?
        // Usually atan2 gives: Right = 0, Down = 90, Left = 180, Up = -90.
        // We want Down to range based on drag.

        // Let's stick to standard math: angle from center. 
        // Initial handle pos is at bottom (90 deg).
        // Delta angle?

        // Simplified: just use standard angle
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        // Normalize so bottom is 0? Or just absolute rotation?
        // User wants rotation. Let's make it relative to "Up" (-90) -> 0;
        // Let's align such that dragging helps. 
        // Standard interaction: Angle matches pointer.

        // Offset so bottom is 0 if we want? 
        // Actually, just passing the raw angle + 90 might feel right if 0 is Up.
        // But `rotation` prop usually expects 0 to be upright.

        // Let's use sensitivity dragging? No, absolute angle is better.
        // But wait, the rotation handle is pinned to the crop rect?
        // No, I'll allow "Virtual" rotation or just render the handle.

        const deg = Math.round(angle + 90); // Make "Down" = 180, Up = 0?
        // atan2: 
        // (0, 1) -> 90 deg. 
        // (1, 0) -> 0 deg.
        // We want (0, 1) to be "Start".

        onRotationChange(deg);
    };

    // Calculate visual bounds of the image (rotated & scaled)
    const visualBounds = useMemo(() => {
        if (!imageSize.width || !stageSize.width) return null;

        const bBox = rotateSize(imageSize.width, imageSize.height, rotation);
        const bBoxDisplayW = bBox.width * scale;
        const bBoxDisplayH = bBox.height * scale;

        const cx = stageSize.width / 2;
        const cy = stageSize.height / 2;

        return {
            x: cx - bBoxDisplayW / 2,
            y: cy - bBoxDisplayH / 2,
            width: bBoxDisplayW,
            height: bBoxDisplayH,
            right: cx + bBoxDisplayW / 2,
            bottom: cy + bBoxDisplayH / 2
        };
    }, [imageSize, stageSize, rotation, scale]);

    return (
        <div className="flex flex-col h-full bg-neutral-900 overflow-hidden relative w-full">
            {/* Stage Container */}
            <div className="flex-1 w-full h-full relative">
                <Stage
                    ref={stageRef}
                    width={stageSize.width}
                    height={stageSize.height}
                    className="cursor-crosshair w-full h-full"
                >
                    <Layer>
                        {/* 1. Image Layer (Centered & Rotated) */}
                        {image && (
                            <KonvaImage
                                image={image}
                                x={stageSize.width / 2}
                                y={stageSize.height / 2}
                                width={imageSize.width * scale}
                                height={imageSize.height * scale}
                                offsetX={(imageSize.width * scale) / 2}
                                offsetY={(imageSize.height * scale) / 2}
                                rotation={rotation}
                            />
                        )}

                        {/* 2. Dimmer Overlay with Hole */}
                        <Path
                            data={overlayPath}
                            fill="rgba(0,0,0,0.6)"
                            listening={false}
                            fillRule="evenodd"
                        />

                        {/* 3. Crop Rect (Interactive) */}
                        <Rect
                            id="crop-rect"
                            x={cropRect.x}
                            y={cropRect.y}
                            width={cropRect.width}
                            height={cropRect.height}
                            draggable
                            dragBoundFunc={(pos) => {
                                if (!visualBounds) return pos;

                                // Constrain to visual bounds of the image
                                const newX = Math.max(visualBounds.x, Math.min(pos.x, visualBounds.right - cropRect.width));
                                const newY = Math.max(visualBounds.y, Math.min(pos.y, visualBounds.bottom - cropRect.height));

                                return { x: newX, y: newY };
                            }}
                            onDragMove={(e) => {
                                setCropRect({
                                    ...cropRect,
                                    x: e.target.x(),
                                    y: e.target.y(),
                                });
                            }}
                            onTransform={(e) => {
                                // Just sync state, constraints handled in boundBoxFunc
                                const node = e.target;
                                setCropRect({
                                    x: node.x(),
                                    y: node.y(),
                                    width: Math.max(50, node.width() * node.scaleX()),
                                    height: Math.max(50, node.height() * node.scaleY()),
                                });
                                // Reset scale implies we must set width/height
                                node.scaleX(1);
                                node.scaleY(1);
                            }}
                            stroke="rgba(255, 255, 255, 0.8)"
                            strokeWidth={1}
                            dash={[10, 5]}
                        />

                        {/* 4. Transformer (Handles) */}
                        <Transformer
                            ref={transformerRef}
                            boundBoxFunc={(oldBox, newBox) => {
                                // 1. Minimum size constraint
                                if (newBox.width < 50 || newBox.height < 50) {
                                    return oldBox;
                                }

                                // 2. Boundary constraint against visualBounds
                                if (visualBounds) {
                                    const { x, y, right, bottom } = visualBounds;

                                    // Make copies to modify
                                    let nx = newBox.x;
                                    let ny = newBox.y;
                                    let nw = newBox.width;
                                    let nh = newBox.height;

                                    // Left Edge
                                    if (nx < x) {
                                        nx = x;
                                        nw = newBox.x + newBox.width - x;
                                    }
                                    // Top Edge
                                    if (ny < y) {
                                        ny = y;
                                        nh = newBox.y + newBox.height - y;
                                    }
                                    // Right Edge
                                    if (nx + nw > right) {
                                        nw = right - nx;
                                    }
                                    // Bottom Edge
                                    if (ny + nh > bottom) {
                                        nh = bottom - ny;
                                    }

                                    // Re-assign corrected values
                                    newBox.x = nx;
                                    newBox.y = ny;
                                    newBox.width = nw;
                                    newBox.height = nh;
                                }

                                return newBox;
                            }}
                            anchorCornerRadius={10}
                            anchorSize={15}
                            anchorStroke="#6366f1"
                            anchorStrokeWidth={2}
                            anchorFill="white"
                            borderStroke="rgba(255,255,255,0.5)"
                            rotateEnabled={false} // We typically don't rotate the crop box itself
                        />

                        {/* 5. Custom Rotation Handle (Canva Style) */}
                        {/* Connected line */}
                        <Line
                            points={[
                                cropRect.x + cropRect.width / 2,
                                cropRect.y + cropRect.height, // Bottom center
                                cropRect.x + cropRect.width / 2,
                                cropRect.y + cropRect.height + 25 // Handle position
                            ]}
                            stroke="white"
                            strokeWidth={1}
                            listening={false}
                        />
                        {/* Handle Circle Group */}
                        <Group
                            x={cropRect.x + cropRect.width / 2}
                            y={cropRect.y + cropRect.height + 25}
                            draggable
                            onDragStart={() => setIsRotating(true)}
                            onDragEnd={() => setIsRotating(false)}
                            onDragMove={handleRotationDrag}
                            dragBoundFunc={(pos) => {
                                // Allow mostly free dragging but perhaps hint circular?
                                // Free is fine
                                return pos;
                            }}
                            onMouseEnter={(e) => {
                                const container = e.target.getStage()?.container();
                                if (container) container.style.cursor = 'grab';
                            }}
                            onMouseLeave={(e) => {
                                if (!isRotating) {
                                    const container = e.target.getStage()?.container();
                                    if (container) container.style.cursor = 'default';
                                }
                            }}
                        >
                            <Circle
                                radius={12}
                                fill="white"
                                stroke="#e2e8f0"
                                strokeWidth={1}
                                shadowColor="black"
                                shadowBlur={5}
                                shadowOpacity={0.2}
                            />
                            {/* Improved Rotation Icon (Two curved arrows) */}
                            <Path
                                data="M21 12a9 9 0 1 1-2.64-6.35L21 3M21 3v6h-6"
                                stroke="#6366f1"
                                strokeWidth={2}
                                scaleX={0.6}
                                scaleY={0.6}
                                x={-7}
                                y={-7}
                                lineCap="round"
                                lineJoin="round"
                            />
                        </Group>

                    </Layer>
                </Stage>
            </div>

            {/* Hint / Controls */}
            <div className="h-12 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between px-6 text-xs text-neutral-500">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Move className="w-3 h-3" />
                        <span>Drag corners to resize</span>
                    </div>
                    <div className="w-px h-4 bg-neutral-800" />
                    <div className="flex items-center gap-2">
                        <RotateCw className="w-3 h-3" />
                        <span>Drag bottom handle to rotate ({Math.round(rotation)}°)</span>
                    </div>
                </div>

                <button
                    onClick={() => {
                        onRotationChange(0);
                        // Recalculate default crop rect (90% centered)
                        if (imageSize.width > 0 && stageSize.width > 0) {
                            const imgDisplayW = imageSize.width * scale;
                            const imgDisplayH = imageSize.height * scale;
                            setCropRect({
                                x: (stageSize.width - imgDisplayW) / 2 + (imgDisplayW * 0.05),
                                y: (stageSize.height - imgDisplayH) / 2 + (imgDisplayH * 0.05),
                                width: imgDisplayW * 0.9,
                                height: imgDisplayH * 0.9,
                            });
                        }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                >
                    <RotateCw className="w-3 h-3 rotate-180" /> {/* Flip RotateCw for CCW until we import RotateCcw */}
                    <span>Reset</span>
                </button>
            </div>
        </div>
    );
};
