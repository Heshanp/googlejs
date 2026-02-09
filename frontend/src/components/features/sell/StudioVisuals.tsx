import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X, Star, Pencil, Sparkles, RotateCcw, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ImageEditor } from './ImageEditor';
import { Button } from '../../ui/Button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StudioImageSlot } from '../../../types/studio-image.types';
import { FullscreenImageCarouselModal } from '../listings/FullscreenImageCarouselModal';

interface StudioVisualsProps {
  images: StudioImageSlot[];
  onAddImages: (files: File[]) => void;
  onRemoveImage: (index: number) => void;
  onReorderImages?: (newOrder: StudioImageSlot[]) => void;
  onEditImage?: (index: number, editedFile: File) => void;
  onGenerateProBackdrop?: (index: number) => void;
  onRestoreOriginal?: (index: number) => void;
  processingSlotIDs?: Set<string>;
  mode?: 'default' | 'vertical';
  maxImages?: number;
}

interface ThumbnailActionsProps {
  canShowEnhance: boolean;
  canShowRestore: boolean;
  canShowEdit: boolean;
  canShowSetMain: boolean;
  isProcessing: boolean;
  onEdit?: () => void;
  onEnhance?: () => void;
  onRestore?: () => void;
  onSetAsMain?: () => void;
  onRemove: () => void;
}

const ThumbnailActions: React.FC<ThumbnailActionsProps> = ({
  canShowEnhance,
  canShowRestore,
  canShowEdit,
  canShowSetMain,
  isProcessing,
  onEdit,
  onEnhance,
  onRestore,
  onSetAsMain,
  onRemove,
}) => {
  const actionClass = 'p-1.5 bg-black/55 hover:bg-indigo-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:pointer-events-none';

  return (
    <div className="absolute top-2 right-2 flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all z-20">
      {canShowEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className={actionClass}
          title="Edit image"
          aria-label="Edit image"
          disabled={isProcessing}
          type="button"
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}
      {canShowEnhance && (
        <button
          onClick={(e) => { e.stopPropagation(); onEnhance?.(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className={actionClass}
          title="Generate professional backdrop"
          aria-label="Generate professional backdrop"
          disabled={isProcessing}
          type="button"
        >
          <Sparkles className="w-3 h-3" />
        </button>
      )}
      {canShowRestore && (
        <button
          onClick={(e) => { e.stopPropagation(); onRestore?.(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className={actionClass}
          title="Restore original"
          aria-label="Restore original"
          disabled={isProcessing}
          type="button"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
      {canShowSetMain && (
        <button
          onClick={(e) => { e.stopPropagation(); onSetAsMain?.(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className={actionClass}
          title="Set as main image"
          aria-label="Set as main image"
          disabled={isProcessing}
          type="button"
        >
          <Star className="w-3 h-3" />
        </button>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(actionClass, 'hover:bg-red-500')}
        title="Remove image"
        aria-label="Remove image"
        disabled={isProcessing}
        type="button"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

interface ProcessingOverlayProps {
  visible: boolean;
}

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-10 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white">
      <Loader2 className="w-5 h-5 animate-spin mb-1" />
      <span className="text-[10px] font-medium uppercase tracking-wide">Processing</span>
    </div>
  );
};

interface SortableImageProps {
  id: string;
  src: string;
  index: number;
  isActive: boolean;
  isMain: boolean;
  canReorder: boolean;
  isProcessing: boolean;
  canRestore: boolean;
  onRemove: () => void;
  onSetAsMain: () => void;
  onSelect: () => void;
  onEdit?: () => void;
  onEnhance?: () => void;
  onRestore?: () => void;
  orientation: 'vertical' | 'horizontal';
}

const SortableImage: React.FC<SortableImageProps> = ({
  id,
  src,
  index,
  isActive,
  isMain,
  canReorder,
  isProcessing,
  canRestore,
  onRemove,
  onSetAsMain,
  onSelect,
  onEdit,
  onEnhance,
  onRestore,
  orientation,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: isProcessing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        'relative overflow-hidden flex-shrink-0 cursor-pointer group border-2 bg-white dark:bg-neutral-800',
        orientation === 'vertical' ? 'aspect-video w-full rounded-lg' : 'w-24 h-full rounded-xl',
        !isDragging && 'transition-all',
        isActive
          ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-900'
          : 'border-transparent hover:border-slate-300 dark:hover:border-neutral-600',
        isDragging && 'z-50 shadow-2xl scale-105 cursor-grabbing'
      )}
      {...attributes}
      {...listeners}
    >
      <img src={src} className="w-full h-full object-cover" alt={`Thumbnail ${index + 1}`} draggable={false} />

      {isMain && (
        <div className={cn(
          'absolute top-2 left-2 bg-indigo-600 text-white font-semibold rounded-md flex items-center gap-1',
          orientation === 'vertical' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]'
        )}>
          <Star className={cn('fill-current', orientation === 'vertical' ? 'w-3 h-3' : 'w-2.5 h-2.5')} />
          Main
        </div>
      )}

      <ThumbnailActions
        canShowEnhance={!!onEnhance}
        canShowRestore={canRestore}
        canShowEdit={!!onEdit}
        canShowSetMain={!isMain && canReorder}
        isProcessing={isProcessing}
        onEdit={onEdit}
        onEnhance={onEnhance}
        onRestore={onRestore}
        onSetAsMain={onSetAsMain}
        onRemove={onRemove}
      />

      <ProcessingOverlay visible={isProcessing} />
    </div>
  );
};

export const StudioVisuals: React.FC<StudioVisualsProps> = ({
  images,
  onAddImages,
  onRemoveImage,
  onReorderImages,
  onEditImage,
  onGenerateProBackdrop,
  onRestoreOriginal,
  processingSlotIDs,
  mode = 'default',
  maxImages = 5,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [editingImageSrc, setEditingImageSrc] = useState<string>('');
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlCacheRef = useRef<Map<File, string>>(new Map());

  const ids = useMemo(() => {
    return images.map((slot) => slot.slotId);
  }, [images]);

  useEffect(() => {
    const nextUrls: string[] = [];
    const currentFiles = new Set<File>();

    images.forEach((slot) => {
      if (slot.active.kind === 'file') {
        currentFiles.add(slot.active.file);
        let url = urlCacheRef.current.get(slot.active.file);
        if (!url) {
          url = URL.createObjectURL(slot.active.file);
          urlCacheRef.current.set(slot.active.file, url);
        }
        nextUrls.push(url);
        return;
      }

      nextUrls.push(slot.active.url);
    });

    // Revoke URLs only after commit so active previews are never revoked mid-render.
    urlCacheRef.current.forEach((url, file) => {
      if (!currentFiles.has(file)) {
        URL.revokeObjectURL(url);
        urlCacheRef.current.delete(file);
      }
    });

    setPreviewUrls(nextUrls);
  }, [images]);

  React.useEffect(() => {
    if (activeIndex >= images.length && images.length > 0) {
      setActiveIndex(images.length - 1);
    }
  }, [images.length, activeIndex]);

  React.useEffect(() => () => {
    urlCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlCacheRef.current.clear();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddImages(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    void event;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && onReorderImages) {
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      const newImages = arrayMove([...images], oldIndex, newIndex);
      onReorderImages(newImages);
      setActiveIndex(newIndex);
    }
  };

  const handleSetAsMain = (index: number) => {
    if (index === 0 || !onReorderImages) return;
    const reordered = [...images];
    const [item] = reordered.splice(index, 1);
    reordered.unshift(item);
    onReorderImages(reordered);
    setActiveIndex(0);
  };

  const openFullscreenAt = (index: number) => {
    setActiveIndex(index);
    setIsFullscreenOpen(true);
  };

  const showPreviousInFullscreen = () => {
    if (images.length === 0) return;
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    } else {
      setActiveIndex(images.length - 1);
    }
  };

  const showNextInFullscreen = () => {
    if (images.length === 0) return;
    if (activeIndex < images.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else {
      setActiveIndex(0);
    }
  };

  const fullscreenImages = useMemo(
    () => previewUrls.map((url, idx) => ({
      id: ids[idx] || `studio-image-${idx}`,
      url,
      alt: `Image ${idx + 1}`,
    })),
    [ids, previewUrls]
  );

  const openImageEditor = (index: number) => {
    const imageUrl = previewUrls[index];
    if (imageUrl) {
      setEditingImageIndex(index);
      setEditingImageSrc(imageUrl);
      setEditorOpen(true);
    }
  };

  const handleEditorSave = (editedFile: File) => {
    if (editingImageIndex !== null && onEditImage) {
      onEditImage(editingImageIndex, editedFile);
    }
    setEditorOpen(false);
    setEditingImageIndex(null);
    setEditingImageSrc('');
  };

  const closeImageEditor = () => {
    setEditorOpen(false);
    setEditingImageIndex(null);
    setEditingImageSrc('');
  };

  if (images.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center p-6 border-slate-100 dark:border-neutral-800',
        mode === 'vertical' ? 'h-64 border-b' : 'w-full md:w-5/12 bg-slate-50 dark:bg-neutral-900/50 border-r h-full rounded-none'
      )}>
        <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="border-dashed">
          <Plus className="w-4 h-4 mr-2" />
          Add Photos
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
          multiple
        />
      </div>
    );
  }

  const currentSlot = images[activeIndex];
  const currentIsProcessing = currentSlot ? processingSlotIDs?.has(currentSlot.slotId) ?? false : false;

  if (mode === 'vertical') {
    return (
      <>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-col gap-2 p-4">
              {previewUrls.map((url, idx) => {
                const slot = images[idx];
                const isProcessing = processingSlotIDs?.has(slot.slotId) ?? false;

                return (
                  <SortableImage
                    key={ids[idx]}
                    id={ids[idx]}
                    src={url}
                    index={idx}
                    isActive={activeIndex === idx}
                    isMain={idx === 0}
                    canReorder={!!onReorderImages}
                    isProcessing={isProcessing}
                    canRestore={!!slot.original}
                    onRemove={() => onRemoveImage(idx)}
                    onSetAsMain={() => handleSetAsMain(idx)}
                    onSelect={() => openFullscreenAt(idx)}
                    onEdit={onEditImage ? () => openImageEditor(idx) : undefined}
                    onEnhance={onGenerateProBackdrop ? () => onGenerateProBackdrop(idx) : undefined}
                    onRestore={onRestoreOriginal ? () => onRestoreOriginal(idx) : undefined}
                    orientation="vertical"
                  />
                );
              })}

              {images.length < maxImages && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video w-full rounded-lg border-2 border-dashed border-slate-300 dark:border-neutral-700 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500 cursor-pointer transition-colors"
                >
                  <Plus className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Add</span>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
                multiple
              />
            </div>
          </SortableContext>
        </DndContext>

        <ImageEditor
          isOpen={editorOpen}
          onClose={closeImageEditor}
          imageSrc={editingImageSrc}
          onSave={handleEditorSave}
        />
        <FullscreenImageCarouselModal
          images={fullscreenImages}
          title="Listing image"
          isOpen={isFullscreenOpen}
          currentIndex={activeIndex}
          onClose={() => setIsFullscreenOpen(false)}
          onSelect={(idx) => setActiveIndex(idx)}
          onPrev={showPreviousInFullscreen}
          onNext={showNextInFullscreen}
        />
      </>
    );
  }

  return (
    <div className="w-full md:w-1/2 bg-slate-50 dark:bg-neutral-900/50 p-6 md:p-10 flex flex-col border-r border-slate-100 dark:border-neutral-800 relative h-full">
      <div className="flex-1 flex items-center justify-center bg-transparent overflow-hidden mb-6 relative min-h-[300px]">
        {previewUrls[activeIndex] ? (
          <img
            src={previewUrls[activeIndex]}
            className="w-full h-full object-contain"
            alt="Main preview"
          />
        ) : (
          <div className="text-gray-400">Select an image</div>
        )}

        <div className="absolute top-0 right-0 flex gap-2 z-20">
          {onEditImage && (
            <button
              onClick={() => openImageEditor(activeIndex)}
              className="bg-white/90 dark:bg-black/50 p-2 rounded-lg shadow-sm hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 dark:text-gray-300 transition-colors"
              title="Edit image"
              aria-label="Edit image"
              disabled={currentIsProcessing}
              type="button"
            >
              <Pencil className="w-5 h-5" />
            </button>
          )}
          {onGenerateProBackdrop && (
            <button
              onClick={() => onGenerateProBackdrop(activeIndex)}
              className="bg-white/90 dark:bg-black/50 p-2 rounded-lg shadow-sm hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 dark:text-gray-300 transition-colors"
              title="Generate professional backdrop"
              aria-label="Generate professional backdrop"
              disabled={currentIsProcessing}
              type="button"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          )}
          {onRestoreOriginal && images[activeIndex]?.original && (
            <button
              onClick={() => onRestoreOriginal(activeIndex)}
              className="bg-white/90 dark:bg-black/50 p-2 rounded-lg shadow-sm hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 dark:text-gray-300 transition-colors"
              title="Restore original"
              aria-label="Restore original"
              disabled={currentIsProcessing}
              type="button"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => onRemoveImage(activeIndex)}
            className="bg-white/90 dark:bg-black/50 p-2 rounded-lg shadow-sm hover:bg-red-50 hover:text-red-500 text-slate-700 dark:text-gray-300 transition-colors"
            title="Remove image"
            aria-label="Remove image"
            disabled={currentIsProcessing}
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ProcessingOverlay visible={currentIsProcessing} />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <div className="h-24 flex gap-3 overflow-x-auto pb-2 scrollbar-hide justify-center">
            {previewUrls.map((url, idx) => {
              const slot = images[idx];
              const isProcessing = processingSlotIDs?.has(slot.slotId) ?? false;

              return (
                <SortableImage
                  key={ids[idx]}
                  id={ids[idx]}
                  src={url}
                  index={idx}
                  isActive={activeIndex === idx}
                  isMain={idx === 0}
                  canReorder={!!onReorderImages}
                  isProcessing={isProcessing}
                  canRestore={!!slot.original}
                  onRemove={() => onRemoveImage(idx)}
                  onSetAsMain={() => handleSetAsMain(idx)}
                  onSelect={() => openFullscreenAt(idx)}
                  onEdit={onEditImage ? () => openImageEditor(idx) : undefined}
                  onEnhance={onGenerateProBackdrop ? () => onGenerateProBackdrop(idx) : undefined}
                  onRestore={onRestoreOriginal ? () => onRestoreOriginal(idx) : undefined}
                  orientation="horizontal"
                />
              );
            })}

            {images.length < maxImages && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-full rounded-xl border-2 border-dashed border-slate-300 dark:border-neutral-700 flex items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500 cursor-pointer transition-colors flex-shrink-0"
              >
                <Plus className="w-6 h-6" />
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        multiple
      />

      <ImageEditor
        isOpen={editorOpen}
        onClose={closeImageEditor}
        imageSrc={editingImageSrc}
        onSave={handleEditorSave}
      />
      <FullscreenImageCarouselModal
        images={fullscreenImages}
        title="Listing image"
        isOpen={isFullscreenOpen}
        currentIndex={activeIndex}
        onClose={() => setIsFullscreenOpen(false)}
        onSelect={(idx) => setActiveIndex(idx)}
        onPrev={showPreviousInFullscreen}
        onNext={showNextInFullscreen}
      />
    </div>
  );
};
