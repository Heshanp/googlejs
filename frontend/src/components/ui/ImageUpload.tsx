import React, { useRef, useState, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { UploadCloud, X, Star, Loader2 } from 'lucide-react';
import { compressImage } from '../../lib/imageCompression';
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

interface ImageUploadProps {
  onChange: (files: File[]) => void;
  value?: File[];
  multiple?: boolean;
  maxSizeInMB?: number;
  accept?: string;
  maxFiles?: number;
  className?: string;
}

// Create a stable ID for each file
const getFileId = (file: File | any, index: number): string => {
  if (file instanceof File) {
    return `file-${file.name}-${file.size}-${file.lastModified}`;
  } else if (typeof file === 'string') {
    return `url-${file}`;
  } else if (file?.url) {
    return `url-${file.url}`;
  }
  return `item-${index}`;
};

// Sortable image item component
interface SortableImageProps {
  id: string;
  src: string;
  index: number;
  isMain: boolean;
  onRemove: () => void;
  onSetAsMain: () => void;
}

const SortableImage: React.FC<SortableImageProps> = ({
  id,
  src,
  index,
  isMain,
  onRemove,
  onSetAsMain,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group aspect-square bg-gray-100 dark:bg-neutral-800 rounded-xl overflow-hidden border-2 cursor-grab",
        !isDragging && "transition-all",
        isDragging && "z-50 shadow-2xl scale-105 cursor-grabbing",
        !isDragging && "border-app-color"
      )}
      {...attributes}
      {...listeners}
    >
      <img src={src} alt={`Image ${index + 1}`} className="w-full h-full object-cover" draggable={false} />

      {/* Main Image Badge */}
      {isMain && (
        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary-600 text-white text-[10px] font-semibold rounded flex items-center gap-0.5">
          <Star className="w-2.5 h-2.5 fill-current" />
          Main
        </div>
      )}

      {/* Action Buttons */}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        {/* Set as Main Button (for non-main images) */}
        {!isMain && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSetAsMain(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 bg-black/50 hover:bg-primary-600 text-white rounded-full transition-colors"
            title="Set as main image"
            aria-label="Set as main image"
          >
            <Star className="w-3 h-3" />
          </button>
        )}
        {/* Remove Button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1 bg-black/50 hover:bg-red-500 text-white rounded-full transition-colors"
          title="Remove image"
          aria-label="Remove image"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onChange,
  value = [],
  multiple = false,
  maxSizeInMB = 10, // Increased since we compress
  accept = "image/*",
  maxFiles = 5,
  className
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Maintain stable blob URLs using a ref-based cache
  const urlCacheRef = useRef<Map<File, string>>(new Map());

  // Generate previews with stable URLs
  const { previews, ids } = useMemo(() => {
    const newPreviews: string[] = [];
    const newIds: string[] = [];

    value.forEach((file, index) => {
      const id = getFileId(file, index);
      newIds.push(id);

      if (file instanceof File) {
        // Check cache first
        let url = urlCacheRef.current.get(file);
        if (!url) {
          url = URL.createObjectURL(file);
          urlCacheRef.current.set(file, url);
        }
        newPreviews.push(url);
      } else if (typeof file === 'string') {
        newPreviews.push(file);
      } else if ((file as any).url) {
        newPreviews.push((file as any).url);
      } else {
        newPreviews.push('');
      }
    });

    // Clean up URLs for files no longer in value
    const currentFiles = new Set(value.filter(f => f instanceof File));
    urlCacheRef.current.forEach((url, file) => {
      if (!currentFiles.has(file)) {
        URL.revokeObjectURL(url);
        urlCacheRef.current.delete(file);
      }
    });

    return { previews: newPreviews, ids: newIds };
  }, [value]);

  // dnd-kit sensors
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

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setIsCompressing(true);

    try {
      const newFiles: File[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          setError('Only image files are allowed');
          continue;
        }

        // Compress the image before adding
        try {
          const compressedFile = await compressImage(file, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.8,
          });
          newFiles.push(compressedFile);
        } catch (compressError) {
          newFiles.push(file);
        }
      }

      if (newFiles.length === 0) {
        setIsCompressing(false);
        return;
      }

      if (multiple) {
        if (value.length + newFiles.length > maxFiles) {
          setError(`You can only upload up to ${maxFiles} images`);
          setIsCompressing(false);
          return;
        }
        onChange([...value, ...newFiles]);
      } else {
        onChange([newFiles[0]]);
      }
    } catch (err) {
      setError('Failed to process images');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...value];
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  const setAsMain = (index: number) => {
    if (index === 0) return;
    const newFiles = [...value];
    const [item] = newFiles.splice(index, 1);
    newFiles.unshift(item);
    onChange(newFiles);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);

      const newFiles = arrayMove([...value], oldIndex, newIndex);
      onChange(newFiles);
    }
  };


  return (
    <div className={cn("w-full", className)}>
      {/* Drop Zone */}
      <div
        className={cn(
          "relative flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-dashed rounded-2xl transition-colors cursor-pointer bg-gray-50/50 dark:bg-neutral-800/50",
          dragActive
            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/10"
            : "border-app-color hover:border-gray-300 dark:hover:border-neutral-600",
          error && "border-red-500 bg-red-50 dark:bg-red-900/10"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDropZone}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple={multiple}
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
          <div className="p-3 bg-white dark:bg-neutral-900 rounded-full shadow-sm mb-3">
            {isCompressing ? (
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6 text-primary-600" />
            )}
          </div>
          <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            {isCompressing ? 'Optimizing images…' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-gray-500">
            {isCompressing ? 'This may take a moment…' : `SVG, PNG, JPG or GIF (max ${maxSizeInMB}MB)`}
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500 font-medium animate-in slide-in-from-top-1">
          {error}
        </p>
      )}

      {/* Sortable Image Grid */}
      {previews.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mt-4">
              {previews.map((src, index) => (
                <SortableImage
                  key={ids[index]}
                  id={ids[index]}
                  src={src}
                  index={index}
                  isMain={index === 0}
                  onRemove={() => removeFile(index)}
                  onSetAsMain={() => setAsMain(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};