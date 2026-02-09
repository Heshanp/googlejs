import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { ListingImage } from '../../../types';
import { cn } from '../../../lib/utils';
import { FullscreenImageCarouselModal } from './FullscreenImageCarouselModal';

interface ImageCarouselProps {
  images: ListingImage[];
  title: string;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, title }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToImage = (index: number) => {
    setCurrentIndex(index);
    if (scrollContainerRef.current) {
      const width = scrollContainerRef.current.offsetWidth;
      scrollContainerRef.current.scrollTo({
        left: width * index,
        behavior: 'smooth'
      });
    }
  };

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < images.length - 1) {
      scrollToImage(currentIndex + 1);
    } else {
      scrollToImage(0); // Loop back
    }
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      scrollToImage(currentIndex - 1);
    } else {
      scrollToImage(images.length - 1); // Loop to end
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const width = scrollContainerRef.current.offsetWidth;
      const scrollPos = scrollContainerRef.current.scrollLeft;
      const index = Math.round(scrollPos / width);
      if (index !== currentIndex) {
        setCurrentIndex(index);
      }
    }
  };

  useEffect(() => {
    if (currentIndex >= images.length && images.length > 0) {
      setCurrentIndex(images.length - 1);
    }
  }, [currentIndex, images.length]);

  return (
    <div className="w-full">
      <FullscreenImageCarouselModal
        images={images.map((img, idx) => ({
          id: img.id || `image-${idx}`,
          url: img.url,
          alt: `${title} - Fullscreen`,
        }))}
        title={title}
        isOpen={isFullscreen}
        currentIndex={currentIndex}
        onClose={() => setIsFullscreen(false)}
        onSelect={scrollToImage}
        onPrev={() => {
          if (images.length === 0) return;
          if (currentIndex > 0) scrollToImage(currentIndex - 1);
          else scrollToImage(images.length - 1);
        }}
        onNext={() => {
          if (images.length === 0) return;
          if (currentIndex < images.length - 1) scrollToImage(currentIndex + 1);
          else scrollToImage(0);
        }}
      />

      <div className="lg:flex lg:items-stretch lg:gap-4">
        {/* Thumbnails (Desktop Left Rail) */}
        {images.length > 1 && (
          <div className="hidden lg:flex flex-shrink-0 w-24 flex-col items-center gap-2 overflow-y-auto no-scrollbar py-1">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => scrollToImage(idx)}
                className={cn(
                  "relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                  idx === currentIndex
                    ? "border-primary-600 ring-2 ring-primary-100 dark:ring-primary-900/20"
                    : "border-transparent opacity-70 hover:opacity-100"
                )}
              >
                <img
                  src={img.url}
                  alt={`Thumbnail ${idx + 1}`}
                  width="80"
                  height="80"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Main Carousel */}
        <div className="relative group rounded-2xl overflow-hidden bg-gray-100 dark:bg-neutral-900 aspect-[4/3] md:aspect-[16/10] lg:flex-1">
          <div
            ref={scrollContainerRef}
            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar h-full w-full"
            onScroll={handleScroll}
          >
            {images.length === 0 ? (
              <div className="flex-shrink-0 w-full h-full flex items-center justify-center">
                <div className="text-center text-gray-400 dark:text-gray-600">
                  <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-medium">No images available</p>
                </div>
              </div>
            ) : (
              images.map((img, idx) => (
                <div
                  key={img.id}
                  className="flex-shrink-0 w-full h-full snap-center cursor-zoom-in relative"
                  onClick={() => setIsFullscreen(true)}
                >
                  <img
                    src={img.url}
                    alt={`${title} - Image ${idx + 1}`}
                    width="800"
                    height="600"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))
            )}
          </div>

          {/* Controls */}
          {images.length > 1 && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={prevImage}
                className="pointer-events-auto p-2 rounded-full bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black/70 shadow-sm backdrop-blur-sm transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextImage}
                className="pointer-events-auto p-2 rounded-full bg-white/80 dark:bg-black/50 hover:bg-white dark:hover:bg-black/70 shadow-sm backdrop-blur-sm transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Indicators & Maximize */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full">
              {currentIndex + 1} / {images.length}
            </div>
            <button
              onClick={() => setIsFullscreen(true)}
              className="pointer-events-auto p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-colors"
              aria-label="View fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Thumbnails (Tablet Bottom Strip) */}
      {images.length > 1 && (
        <div className="hidden md:flex lg:hidden gap-2 overflow-x-auto pb-2 no-scrollbar mt-4">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => scrollToImage(idx)}
              className={cn(
                "relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                idx === currentIndex
                  ? "border-primary-600 ring-2 ring-primary-100 dark:ring-primary-900/20"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <img
                src={img.url}
                alt={`Thumbnail ${idx + 1}`}
                width="80"
                height="80"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
