/**
 * Image Editor Utility Functions
 * Handles cropping, annotation export, and file conversion
 */

interface PixelCrop {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Creates an HTMLImageElement from a URL
 */
export const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.crossOrigin = 'anonymous';
        image.src = url;
    });

/**
 * Rotates image by specified degrees
 */
export function getRadianAngle(degreeValue: number): number {
    return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding box of a rotated rectangle
 */
export function rotateSize(width: number, height: number, rotation: number): { width: number; height: number } {
    const rotRad = getRadianAngle(rotation);
    return {
        width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    };
}

/**
 * Gets the cropped image as a Blob
 */
export async function getCroppedImg(
    imageSrc: string,
    pixelCrop: PixelCrop,
    rotation = 0,
    flip = { horizontal: false, vertical: false }
): Promise<Blob | null> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return null;
    }

    const rotRad = getRadianAngle(rotation);

    // Calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        image.width,
        image.height,
        rotation
    );

    // Set canvas size to match the bounding box
    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    // Translate canvas context to center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
    ctx.translate(-image.width / 2, -image.height / 2);

    // Draw the rotated image
    ctx.drawImage(image, 0, 0);

    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');

    if (!croppedCtx) {
        return null;
    }

    // Set the size of the cropped canvas
    croppedCanvas.width = pixelCrop.width;
    croppedCanvas.height = pixelCrop.height;

    // Draw the cropped image
    croppedCtx.drawImage(
        canvas,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    // Return as a blob
    return new Promise((resolve) => {
        croppedCanvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg', 0.95);
    });
}

/**
 * Converts a data URL to a File object
 */
export function dataURLtoFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

/**
 * Converts a Blob to a File object
 */
export function blobToFile(blob: Blob, filename: string): File {
    return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}

/**
 * Generates a unique filename for edited images
 */
export function generateEditedFilename(originalName: string = 'image'): string {
    const timestamp = Date.now();
    const baseName = originalName.replace(/\.[^/.]+$/, ''); // Remove extension
    return `${baseName}_edited_${timestamp}.jpg`;
}

/**
 * Merges an annotation canvas with a base image
 * Returns the merged result as a Blob
 */
export async function mergeAnnotationsWithImage(
    baseImageSrc: string,
    annotationDataUrl: string
): Promise<Blob | null> {
    const baseImage = await createImage(baseImageSrc);
    const annotationImage = await createImage(annotationDataUrl);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return null;
    }

    canvas.width = baseImage.width;
    canvas.height = baseImage.height;

    // Draw base image
    ctx.drawImage(baseImage, 0, 0);

    // Draw annotations on top
    ctx.drawImage(annotationImage, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg', 0.95);
    });
}

/**
 * Gets the natural dimensions of an image from URL
 */
export async function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    const image = await createImage(url);
    return {
        width: image.naturalWidth,
        height: image.naturalHeight,
    };
}
