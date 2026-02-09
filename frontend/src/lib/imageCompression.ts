/**
 * Image compression utility for client-side image processing
 * Compresses images before upload to reduce bandwidth and improve upload speed
 */

interface CompressOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    mimeType?: 'image/jpeg' | 'image/webp';
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.8,
    mimeType: 'image/jpeg',
};

/**
 * Compress an image file using Canvas API
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns A new compressed File object
 */
export async function compressImage(
    file: File,
    options: CompressOptions = {}
): Promise<File> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Don't process non-image files
    if (!file.type.startsWith('image/')) {
        return file;
    }

    // Don't process GIFs (would lose animation)
    if (file.type === 'image/gif') {
        return file;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
        }

        img.onload = () => {
            // Calculate new dimensions maintaining aspect ratio
            let { width, height } = img;

            if (width > opts.maxWidth || height > opts.maxHeight) {
                const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            // Set canvas size and draw image
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to blob
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to compress image'));
                        return;
                    }

                    // Create new File from blob
                    const compressedFile = new File([blob], file.name, {
                        type: opts.mimeType,
                        lastModified: Date.now(),
                    });

                    resolve(compressedFile);
                },
                opts.mimeType,
                opts.quality
            );
        };

        img.onerror = () => {
            reject(new Error('Failed to load image'));
        };

        // Load image from file
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Compress multiple image files
 * @param files - Array of image files to compress
 * @param options - Compression options
 * @returns Array of compressed File objects
 */
export async function compressImages(
    files: File[],
    options: CompressOptions = {}
): Promise<File[]> {
    return Promise.all(files.map((file) => compressImage(file, options)));
}
