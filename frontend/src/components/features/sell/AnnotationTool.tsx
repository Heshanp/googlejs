'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Arrow, Rect, Circle, Text, Transformer, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { cn } from '../../../lib/utils';
import { Type, ArrowRight, Square, CircleIcon, Pencil, Trash2, Undo2, Redo2, Copy } from 'lucide-react';

type ToolType = 'select' | 'text' | 'arrow' | 'rectangle' | 'circle' | 'freehand';

interface ShapeBase {
    id: string;
    type: ToolType;
    color: string;
}

interface TextShape extends ShapeBase {
    type: 'text';
    x: number;
    y: number;
    text: string;
    fontSize: number;
}

interface ArrowShape extends ShapeBase {
    type: 'arrow';
    points: number[];
    strokeWidth: number;
}

interface RectangleShape extends ShapeBase {
    type: 'rectangle';
    x: number;
    y: number;
    width: number;
    height: number;
    strokeWidth: number;
}

interface CircleShape extends ShapeBase {
    type: 'circle';
    x: number;
    y: number;
    radius: number;
    strokeWidth: number;
}

interface FreehandShape extends ShapeBase {
    type: 'freehand';
    points: number[];
    strokeWidth: number;
}

type Shape = TextShape | ArrowShape | RectangleShape | CircleShape | FreehandShape;

interface AnnotationToolProps {
    imageSrc: string;
    containerWidth: number;
    containerHeight: number;
    stageRef: React.RefObject<Konva.Stage | null>;
}

const colors = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'White', value: '#ffffff' },
    { name: 'Black', value: '#000000' },
];

const tools: { type: ToolType; icon: React.ReactNode; label: string }[] = [
    { type: 'text', icon: <Type className="w-4 h-4" />, label: 'Text' },
    { type: 'arrow', icon: <ArrowRight className="w-4 h-4" />, label: 'Arrow' },
    { type: 'rectangle', icon: <Square className="w-4 h-4" />, label: 'Rectangle' },
    { type: 'circle', icon: <CircleIcon className="w-4 h-4" />, label: 'Circle' },
    { type: 'freehand', icon: <Pencil className="w-4 h-4" />, label: 'Draw' },
];

export const AnnotationTool: React.FC<AnnotationToolProps> = ({
    imageSrc,
    containerWidth,
    containerHeight,
    stageRef,
}) => {
    const [tool, setTool] = useState<ToolType>('arrow');
    const [color, setColor] = useState('#ef4444');
    const [shapes, setShapes] = useState<Shape[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [history, setHistory] = useState<Shape[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
    const [stageSize, setStageSize] = useState({ width: containerWidth, height: containerHeight });
    const [scale, setScale] = useState(1);

    const transformerRef = useRef<Konva.Transformer>(null);
    const drawingShapeRef = useRef<Shape | null>(null);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Load background image
    useEffect(() => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = imageSrc;
        img.onload = () => {
            setBackgroundImage(img);
            // Calculate scale to fit image in container
            const scaleX = containerWidth / img.width;
            const scaleY = containerHeight / img.height;
            const newScale = Math.min(scaleX, scaleY, 1);
            setScale(newScale);
            setStageSize({
                width: img.width * newScale,
                height: img.height * newScale,
            });
        };
    }, [imageSrc, containerWidth, containerHeight]);

    // Update transformer when selection changes
    useEffect(() => {
        if (transformerRef.current && stageRef.current) {
            const stage = stageRef.current;
            const selectedNode = stage.findOne(`#${selectedId}`);
            if (selectedNode) {
                transformerRef.current.nodes([selectedNode]);
            } else {
                transformerRef.current.nodes([]);
            }
        }
    }, [selectedId, stageRef]);

    const generateId = () => `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const saveToHistory = (newShapes: Shape[]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(newShapes);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setShapes(history[historyIndex - 1]);
            setSelectedId(null);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setShapes(history[historyIndex + 1]);
            setSelectedId(null);
        }
    };

    const deleteSelected = () => {
        if (selectedId) {
            const newShapes = shapes.filter((s) => s.id !== selectedId);
            setShapes(newShapes);
            saveToHistory(newShapes);
            setSelectedId(null);
        }
    };

    // Handle keyboard events for delete
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
                // Don't delete if user is typing in a text input
                if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                    return;
                }
                e.preventDefault();
                deleteSelected();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, shapes]);

    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        // If clicking on empty stage, deselect
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
            setSelectedId(null);
        }

        // If a shape is selected and we're not in drawing mode, don't start drawing
        if (selectedId && clickedOnEmpty) {
            // User clicked away from selected shape, deselect but don't draw
            return;
        }

        const stage = e.target.getStage();
        if (!stage) return;

        const pos = stage.getPointerPosition();
        if (!pos) return;

        // Adjust for scale
        const adjustedPos = { x: pos.x / scale, y: pos.y / scale };

        setIsDrawing(true);
        const id = generateId();

        let newShape: Shape;

        switch (tool) {
            case 'text':
                // Create initial text shape at click position
                newShape = {
                    id,
                    type: 'text',
                    x: adjustedPos.x,
                    y: adjustedPos.y,
                    text: 'Enter text', // Placeholder
                    fontSize: 24,
                    color,
                };
                const newShapes = [...shapes, newShape];
                setShapes(newShapes);
                saveToHistory(newShapes);

                // Immediately enter edit mode
                setEditingTextId(id);
                setIsDrawing(false);
                setTool('select' as any); // Reset tool to avoid creating multiple text boxes
                return;

            case 'arrow':
                newShape = {
                    id,
                    type: 'arrow',
                    points: [adjustedPos.x, adjustedPos.y, adjustedPos.x, adjustedPos.y],
                    strokeWidth: 4,
                    color,
                };
                break;

            case 'rectangle':
                newShape = {
                    id,
                    type: 'rectangle',
                    x: adjustedPos.x,
                    y: adjustedPos.y,
                    width: 0,
                    height: 0,
                    strokeWidth: 3,
                    color,
                };
                break;

            case 'circle':
                newShape = {
                    id,
                    type: 'circle',
                    x: adjustedPos.x,
                    y: adjustedPos.y,
                    radius: 0,
                    strokeWidth: 3,
                    color,
                };
                break;

            case 'freehand':
                newShape = {
                    id,
                    type: 'freehand',
                    points: [adjustedPos.x, adjustedPos.y],
                    strokeWidth: 4,
                    color,
                };
                break;

            default:
                return;
        }

        drawingShapeRef.current = newShape;
        setShapes([...shapes, newShape]);
    };

    const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (!isDrawing || !drawingShapeRef.current) return;

        const stage = e.target.getStage();
        if (!stage) return;

        const pos = stage.getPointerPosition();
        if (!pos) return;

        const adjustedPos = { x: pos.x / scale, y: pos.y / scale };
        const currentShape = drawingShapeRef.current;

        let updatedShape: Shape;

        switch (currentShape.type) {
            case 'arrow':
                updatedShape = {
                    ...currentShape,
                    points: [currentShape.points[0], currentShape.points[1], adjustedPos.x, adjustedPos.y],
                };
                break;

            case 'rectangle':
                updatedShape = {
                    ...currentShape,
                    width: adjustedPos.x - currentShape.x,
                    height: adjustedPos.y - currentShape.y,
                };
                break;

            case 'circle':
                const dx = adjustedPos.x - currentShape.x;
                const dy = adjustedPos.y - currentShape.y;
                updatedShape = {
                    ...currentShape,
                    radius: Math.sqrt(dx * dx + dy * dy),
                };
                break;

            case 'freehand':
                updatedShape = {
                    ...currentShape,
                    points: [...currentShape.points, adjustedPos.x, adjustedPos.y],
                };
                break;

            default:
                return;
        }

        drawingShapeRef.current = updatedShape;
        setShapes((prev) => prev.map((s) => (s.id === currentShape.id ? updatedShape : s)));
    };

    const handleMouseUp = () => {
        if (isDrawing && drawingShapeRef.current) {
            saveToHistory(shapes);
        }
        setIsDrawing(false);
        drawingShapeRef.current = null;
    };

    const handleShapeClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>, id: string) => {
        // Stop propagation so stage doesn't deselect
        e.cancelBubble = true;
        setSelectedId(id);
    };

    const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, shape: Shape) => {
        const node = e.target;
        let updatedShape: Shape;

        switch (shape.type) {
            case 'text':
            case 'rectangle':
            case 'circle':
                updatedShape = { ...shape, x: node.x(), y: node.y() };
                break;
            case 'arrow':
            case 'freehand':
                // For line-based shapes, need to offset all points
                const oldX = shape.type === 'arrow' ? shape.points[0] : shape.points[0];
                const oldY = shape.type === 'arrow' ? shape.points[1] : shape.points[1];
                const dx = node.x();
                const dy = node.y();
                // Reset node position and apply offset to points
                node.position({ x: 0, y: 0 });
                const newPoints = shape.points.map((p, i) => p + (i % 2 === 0 ? dx : dy));
                updatedShape = { ...shape, points: newPoints };
                break;
            default:
                return;
        }

        const newShapes = shapes.map((s) => (s.id === shape.id ? updatedShape : s));
        setShapes(newShapes);
        saveToHistory(newShapes);
    };

    const handleTextEdit = (id: string, newText: string) => {
        const newShapes = shapes.map((s) =>
            s.id === id ? { ...s, text: newText } : s
        );
        setShapes(newShapes);
    };

    const handleTextEditComplete = () => {
        if (!editingTextId) return;

        // Remove empty text shapes
        const currentShape = shapes.find(s => s.id === editingTextId);
        if (currentShape && (currentShape as TextShape).text.trim() === '') {
            const newShapes = shapes.filter(s => s.id !== editingTextId);
            setShapes(newShapes);
            saveToHistory(newShapes);
        } else {
            saveToHistory(shapes);
        }
        setEditingTextId(null);
    };

    // Focus textarea when editing starts
    useEffect(() => {
        if (editingTextId && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, [editingTextId]);

    const renderTextEditor = () => {
        if (!editingTextId) return null;

        const shape = shapes.find(s => s.id === editingTextId) as TextShape;
        if (!shape) return null;

        return (
            <textarea
                ref={textareaRef}
                value={shape.text}
                onChange={(e) => handleTextEdit(shape.id, e.target.value)}
                onBlur={handleTextEditComplete}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleTextEditComplete();
                    }
                }}
                style={{
                    position: 'absolute',
                    top: shape.y * scale,
                    left: shape.x * scale,
                    fontSize: `${shape.fontSize * scale}px`,
                    color: shape.color,
                    lineHeight: 1,
                    height: 'auto',
                    minWidth: '50px',
                    background: 'transparent',
                    border: '1px dashed #6366f1', // faint border to show edit area
                    outline: 'none',
                    resize: 'none',
                    overflow: 'hidden',
                    whiteSpace: 'pre',
                    zIndex: 10,
                    fontFamily: 'sans-serif', // match Konva default
                    padding: 0,
                    margin: -1,
                }}
            />
        );
    };



    const duplicateSelected = () => {
        if (!selectedId) return;
        const shape = shapes.find(s => s.id === selectedId);
        if (!shape) return;

        let newShape: Shape;
        if (shape.type === 'arrow' || shape.type === 'freehand') {
            newShape = {
                ...shape,
                id: crypto.randomUUID(),
                points: shape.points.map(p => p + 20)
            };
        } else {
            newShape = {
                ...shape,
                id: crypto.randomUUID(),
                x: shape.x + 20,
                y: shape.y + 20,
            } as Shape;
        }

        const newShapes = [...shapes, newShape];
        setShapes(newShapes);
        saveToHistory(newShapes);
        setSelectedId(newShape.id);
    };

    const getShapePosition = (shape: Shape) => {
        if (shape.type === 'arrow' || shape.type === 'freehand') {
            return { x: shape.points[0], y: shape.points[1] };
        }
        // Shapes with x/y
        return { x: (shape as any).x, y: (shape as any).y };
    };

    const renderFloatingToolbar = () => {
        if (!selectedId || editingTextId) return null;
        const shape = shapes.find(s => s.id === selectedId);
        if (!shape) return null;

        const pos = getShapePosition(shape);

        return (
            <div
                style={{
                    position: 'absolute',
                    top: (pos.y * scale) - 45,
                    left: pos.x * scale,
                    zIndex: 20,
                    transform: 'translate(0, 0)'
                }}
                className="flex items-center gap-1 bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-1 border border-app-color"
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        duplicateSelected();
                    }}
                    className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-neutral-700 dark:text-neutral-200 hover:text-indigo-600 transition-colors"
                    title="Duplicate"
                >
                    <Copy className="w-4 h-4" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        deleteSelected();
                    }}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500 hover:text-red-700 transition-colors"
                    title="Delete"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                {shape.type === 'text' && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditingTextId(shape.id);
                        }}
                        className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-neutral-700 dark:text-neutral-200 hover:text-indigo-600 transition-colors"
                        title="Edit Text"
                    >
                        <Type className="w-4 h-4" />
                    </button>
                )}
            </div>
        );
    };

    const renderShape = (shape: Shape) => {
        const commonProps = {
            id: shape.id,
            onClick: (e: Konva.KonvaEventObject<MouseEvent>) => handleShapeClick(e, shape.id),
            onTap: (e: Konva.KonvaEventObject<TouchEvent>) => handleShapeClick(e, shape.id),
            onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(e, shape),
            draggable: !editingTextId, // Disable dragging when editing text
            onDblClick: () => {
                if (shape.type === 'text') {
                    setEditingTextId(shape.id);
                }
            },
            // Visual feedback when selected
            strokeScaleEnabled: false,
        };

        switch (shape.type) {
            case 'text':
                // Hide text node while editing
                if (editingTextId === shape.id) return null;

                return (
                    <Text
                        key={shape.id}
                        {...commonProps}
                        x={shape.x}
                        y={shape.y}
                        text={shape.text}
                        fontSize={shape.fontSize}
                        fill={shape.color}
                        fontFamily="sans-serif"
                    />
                );

            case 'arrow':
                return (
                    <Arrow
                        key={shape.id}
                        {...commonProps}
                        points={shape.points}
                        stroke={shape.color}
                        strokeWidth={shape.strokeWidth}
                        fill={shape.color}
                        pointerLength={12}
                        pointerWidth={10}
                    />
                );

            case 'rectangle':
                return (
                    <Rect
                        key={shape.id}
                        {...commonProps}
                        x={shape.x}
                        y={shape.y}
                        width={shape.width}
                        height={shape.height}
                        stroke={shape.color}
                        strokeWidth={shape.strokeWidth}
                    />
                );

            case 'circle':
                return (
                    <Circle
                        key={shape.id}
                        {...commonProps}
                        x={shape.x}
                        y={shape.y}
                        radius={shape.radius}
                        stroke={shape.color}
                        strokeWidth={shape.strokeWidth}
                    />
                );

            case 'freehand':
                return (
                    <Line
                        key={shape.id}
                        {...commonProps}
                        points={shape.points}
                        stroke={shape.color}
                        strokeWidth={shape.strokeWidth}
                        tension={0.5}
                        lineCap="round"
                        lineJoin="round"
                    />
                );

            default:
                return null;
        }
    };




    return (
        <div className="flex flex-col h-full">
            {/* Canvas Area */}
            <div className="flex-1 flex items-center justify-center bg-neutral-900 overflow-hidden relative">
                <div style={{ width: stageSize.width, height: stageSize.height, position: 'relative' }}>
                    {renderTextEditor()}
                    {renderFloatingToolbar()}
                    <Stage
                        ref={stageRef}
                        width={stageSize.width}
                        height={stageSize.height}
                        scaleX={scale}
                        scaleY={scale}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onTouchStart={handleMouseDown}
                        onTouchMove={handleMouseMove}
                        onTouchEnd={handleMouseUp}
                        style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
                    >
                        <Layer>
                            {/* Background Image */}
                            {backgroundImage && (
                                <KonvaImage
                                    image={backgroundImage}
                                    width={backgroundImage.width}
                                    height={backgroundImage.height}
                                />
                            )}

                            {/* Shapes */}
                            {shapes.map(renderShape)}

                            {/* Transformer for selected shape */}
                            <Transformer ref={transformerRef} />
                        </Layer>
                    </Stage>
                </div>
            </div>

            {/* Toolbar */}
            <div className="p-4 bg-neutral-800 border-t border-neutral-700 space-y-4">
                {/* Tools */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-400 w-16">Tool:</span>
                    <div className="flex gap-1.5 flex-wrap">
                        {tools.map((t) => (
                            <button
                                key={t.type}
                                onClick={() => {
                                    setTool(t.type);
                                    setSelectedId(null);
                                }}
                                title={t.label}
                                className={cn(
                                    "p-2.5 rounded-md transition-colors",
                                    tool === t.type
                                        ? "bg-indigo-600 text-white"
                                        : "bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
                                )}
                            >
                                {t.icon}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1" />

                    {/* Undo/Redo/Delete */}
                    <button
                        onClick={undo}
                        disabled={historyIndex <= 0}
                        className="p-2.5 rounded-md bg-neutral-700 text-neutral-300 hover:bg-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Undo"
                    >
                        <Undo2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={redo}
                        disabled={historyIndex >= history.length - 1}
                        className="p-2.5 rounded-md bg-neutral-700 text-neutral-300 hover:bg-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Redo"
                    >
                        <Redo2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={deleteSelected}
                        disabled={!selectedId}
                        className="p-2.5 rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/40 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Delete selected"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Colors */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-400 w-16">Color:</span>
                    <div className="flex gap-1.5">
                        {colors.map((c) => (
                            <button
                                key={c.value}
                                onClick={() => setColor(c.value)}
                                title={c.name}
                                className={cn(
                                    "w-7 h-7 rounded-full border-2 transition-transform hover:scale-110",
                                    color === c.value ? "border-white scale-110" : "border-transparent"
                                )}
                                style={{ backgroundColor: c.value }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
