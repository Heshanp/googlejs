'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Crop, Pencil, Check } from 'lucide-react';
import { Area } from 'react-easy-crop';
import Konva from 'konva';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/Button';
import { CropTool } from './CropTool';
import { AnnotationTool } from './AnnotationTool';
import {
    getCroppedImg,
    blobToFile,
    generateEditedFilename,
} from '../../../utils/imageEditorUtils';

type EditorTab = 'crop' | 'annotate';

interface ImageEditorProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    originalFileName?: string;
    onSave: (editedFile: File) => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
    isOpen,
    onClose,
    imageSrc,
    originalFileName,
    onSave,
}) => {
    const [activeTab, setActiveTab] = useState<EditorTab>('crop');
    const [isSaving, setIsSaving] = useState(false);

    // Crop state
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [rotation, setRotation] = useState(0);
    const [workingImageSrc, setWorkingImageSrc] = useState(imageSrc);

    // Annotation state
    const stageRef = useRef<Konva.Stage | null>(null);
    const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset state when image changes
    useEffect(() => {
        setWorkingImageSrc(imageSrc);
        setRotation(0);
        setCroppedAreaPixels(null);
        setActiveTab('crop');
    }, [imageSrc]);

    // Calculate container size on mount and resize
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setContainerSize({
                    width: rect.width,
                    height: rect.height - 80, // Account for toolbar
                });
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [isOpen]);

    const handleCropComplete = useCallback((area: Area) => {
        setCroppedAreaPixels(area);
    }, []);

    const applyCrop = async () => {
        if (!croppedAreaPixels) return;

        try {
            const croppedBlob = await getCroppedImg(workingImageSrc, croppedAreaPixels, rotation);
            if (croppedBlob) {
                const croppedUrl = URL.createObjectURL(croppedBlob);
                setWorkingImageSrc(croppedUrl);
                setRotation(0);
                setCroppedAreaPixels(null);
            }
        } catch (error) {
        }
    };

    const handleSave = async () => {
        setIsSaving(true);

        try {
            let finalBlob: Blob | null = null;

            if (activeTab === 'crop' && croppedAreaPixels) {
                // Apply pending crop first
                finalBlob = await getCroppedImg(workingImageSrc, croppedAreaPixels, rotation);
            } else if (activeTab === 'annotate' && stageRef.current) {
                // Export annotated canvas at full resolution
                const stage = stageRef.current;
                const dataUrl = stage.toDataURL({
                    pixelRatio: 2,
                    mimeType: 'image/jpeg',
                    quality: 0.95
                });
                const response = await fetch(dataUrl);
                finalBlob = await response.blob();
            } else {
                // Return the working image (might have been cropped and applied earlier)
                const response = await fetch(workingImageSrc);
                finalBlob = await response.blob();
            }

            if (finalBlob && finalBlob.size > 0) {
                const filename = generateEditedFilename(originalFileName);
                const file = blobToFile(finalBlob, filename);
                onSave(file);
                onClose();
            } else {
            }
        } catch (error) {
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full h-full max-w-5xl max-h-[90vh] mx-4 bg-neutral-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-semibold text-white">Edit Image</h2>

                        {/* Tab Switcher */}
                        <div className="flex bg-neutral-800 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('crop')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                    activeTab === 'crop'
                                        ? "bg-indigo-600 text-white"
                                        : "text-neutral-400 hover:text-white"
                                )}
                            >
                                <Crop className="w-4 h-4" />
                                Crop
                            </button>
                            <button
                                onClick={() => setActiveTab('annotate')}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                    activeTab === 'annotate'
                                        ? "bg-indigo-600 text-white"
                                        : "text-neutral-400 hover:text-white"
                                )}
                            >
                                <Pencil className="w-4 h-4" />
                                Annotate
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {activeTab === 'crop' && croppedAreaPixels && (
                            <Button
                                onClick={applyCrop}
                                variant="outline"
                                size="sm"
                                className="border-neutral-600 text-neutral-300 hover:bg-neutral-800"
                            >
                                Apply Crop
                            </Button>
                        )}
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isSaving ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Check className="w-4 h-4" />
                                    Save
                                </span>
                            )}
                        </Button>
                        <button
                            onClick={onClose}
                            className="p-2 text-neutral-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div ref={containerRef} className="flex-1 overflow-hidden">
                    {activeTab === 'crop' ? (
                        <CropTool
                            imageSrc={workingImageSrc}
                            onCropComplete={handleCropComplete}
                            rotation={rotation}
                            onRotationChange={setRotation}
                        />
                    ) : (
                        <AnnotationTool
                            imageSrc={workingImageSrc}
                            containerWidth={containerSize.width}
                            containerHeight={containerSize.height}
                            stageRef={stageRef}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
