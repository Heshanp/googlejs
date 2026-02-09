import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Plus, Zap, ShieldCheck, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { compressImages } from '../../../lib/imageCompression';

interface StudioUploadProps {
    onUpload: (files: File[]) => void;
}

const MIN_IMAGES = 2;

export const StudioUpload: React.FC<StudioUploadProps> = ({ onUpload }) => {
    const [stagedFiles, setStagedFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const [activeSlot, setActiveSlot] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);

    // Generate preview URLs for staged files
    useEffect(() => {
        const urls = stagedFiles.map(file => URL.createObjectURL(file));
        setPreviews(urls);
        return () => urls.forEach(url => URL.revokeObjectURL(url));
    }, [stagedFiles]);

    // Auto-trigger analysis once minimum images are met
    useEffect(() => {
        if (stagedFiles.length >= MIN_IMAGES && !isCompressing) {
            const timer = setTimeout(() => onUpload(stagedFiles), 600);
            return () => clearTimeout(timer);
        }
    }, [stagedFiles, onUpload, isCompressing]);

    const addFiles = useCallback(async (files: File[]) => {
        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        // Compress images before staging
        setIsCompressing(true);
        try {
            const compressed = await compressImages(imageFiles, {
                maxWidth: 1200,
                maxHeight: 1200,
                quality: 0.8,
            });

            setStagedFiles(prev => {
                if (activeSlot !== null && activeSlot < prev.length) {
                    // Replace a specific slot
                    const updated = [...prev];
                    updated[activeSlot] = compressed[0];
                    return updated;
                }
                return [...prev, ...compressed];
            });
        } catch (err) {
            // Fallback to uncompressed files
            setStagedFiles(prev => {
                if (activeSlot !== null && activeSlot < prev.length) {
                    const updated = [...prev];
                    updated[activeSlot] = imageFiles[0];
                    return updated;
                }
                return [...prev, ...imageFiles];
            });
        } finally {
            setIsCompressing(false);
        }
        setActiveSlot(null);
    }, [activeSlot]);

    const handleSlotClick = (slotIndex: number) => {
        setActiveSlot(slotIndex >= stagedFiles.length ? null : slotIndex);
        inputRef.current!.value = '';
        inputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(Array.from(e.target.files));
        }
    };

    const handleRemove = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setStagedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFiles(Array.from(e.dataTransfer.files));
        }
    };

    // Determine how many slots to show
    // Once minimum is met, don't add extra slots — analysis is about to start
    const filledCount = stagedFiles.length;
    const totalSlots = filledCount >= MIN_IMAGES ? filledCount : Math.max(MIN_IMAGES, filledCount + 1);
    const slots = Array.from({ length: totalSlots }, (_, i) => i);

    return (
        <div className="w-full max-w-2xl text-center animate-in slide-in-from-bottom-8 duration-700 fade-in fill-mode-forwards">
            <h1 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white">Sell in seconds.</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-10 text-lg">
                Upload at least {MIN_IMAGES} photos. We'll handle the rest.
            </p>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "relative bg-white dark:bg-neutral-900 border-2 border-dashed border-app-color transition-all duration-300 rounded-3xl p-8 shadow-sm",
                    isDragging && "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 scale-[1.01]"
                )}
            >
                <div className="flex items-center justify-center gap-4 flex-wrap">
                    {slots.map((slotIndex) => {
                        const hasImage = slotIndex < filledCount;
                        const isRequired = slotIndex < MIN_IMAGES;

                        return (
                            <div
                                key={slotIndex}
                                onClick={() => handleSlotClick(slotIndex)}
                                className={cn(
                                    "relative w-40 h-40 rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden flex-shrink-0",
                                    hasImage
                                        ? "border-2 border-app-color hover:border-indigo-400 dark:hover:border-indigo-500"
                                        : "border-2 border-dashed border-app-color hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10",
                                    !hasImage && "group"
                                )}
                            >
                                {hasImage ? (
                                    <>
                                        <img
                                            src={previews[slotIndex]}
                                            alt={`Photo ${slotIndex + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            aria-label={`Remove photo ${slotIndex + 1}`}
                                            onClick={(e) => handleRemove(slotIndex, e)}
                                            className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5 text-white" />
                                        </button>
                                        {slotIndex === 0 && (
                                            <span className="absolute bottom-2 left-2 text-[10px] font-semibold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                                                Main
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full gap-2">
                                        {slotIndex < MIN_IMAGES ? (
                                            <Camera className="w-7 h-7 text-slate-400 dark:text-neutral-500 group-hover:text-indigo-500 transition-colors" />
                                        ) : (
                                            <Plus className="w-7 h-7 text-slate-400 dark:text-neutral-500 group-hover:text-indigo-500 transition-colors" />
                                        )}
                                        <span className="text-xs text-slate-400 dark:text-neutral-500 font-medium">
                                            {isRequired ? `Photo ${slotIndex + 1}` : 'Add more'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {filledCount < MIN_IMAGES && (
                    <p className="mt-5 text-sm text-slate-400 dark:text-neutral-500">
                        {filledCount === 0
                            ? 'Click a slot or drag photos here'
                            : `${MIN_IMAGES - filledCount} more photo needed`}
                    </p>
                )}

                <input
                    type="file"
                    ref={inputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                    multiple
                    aria-label="Upload photos"
                />
            </div>

            <div className="mt-8 flex justify-center gap-8 text-slate-400 text-sm">
                <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> AI-Powered</span>
                <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Secure</span>
            </div>
        </div>
    );
};
