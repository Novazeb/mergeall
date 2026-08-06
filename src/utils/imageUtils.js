import imageCompression from 'browser-image-compression';
import JSZip from 'jszip';

/**
 * Get image dimensions (width, height, aspectRatio, dataUrl preview)
 */
export function getImageMetadata(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
        previewUrl: url
      });
    };
    
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

/**
 * Compress a single image file with specified parameters
 * Options:
 * - quality: number 0.1 to 1.0 (default 0.75)
 * - maxWidthOrHeight: number or undefined
 * - outputFileType: 'original' | 'image/jpeg' | 'image/png' | 'image/webp'
 */
export async function compressImage(file, options = {}, onProgress) {
  const {
    quality = 0.75,
    maxWidthOrHeight,
    outputFileType = 'original'
  } = options;

  let targetType = outputFileType;
  if (outputFileType === 'original') {
    targetType = file.type;
  }

  const compressionOptions = {
    maxSizeMB: 50, // High bound so quality setting governs compression
    initialQuality: quality,
    useWebWorker: true,
    fileType: targetType,
    onProgress: (progress) => {
      if (onProgress) onProgress(progress);
    }
  };

  if (maxWidthOrHeight && maxWidthOrHeight > 0) {
    compressionOptions.maxWidthOrHeight = maxWidthOrHeight;
  }

  try {
    const compressedBlob = await imageCompression(file, compressionOptions);

    // Determine extension based on target MIME type
    let ext = file.name.split('.').pop();
    if (targetType === 'image/jpeg') ext = 'jpg';
    else if (targetType === 'image/png') ext = 'png';
    else if (targetType === 'image/webp') ext = 'webp';

    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const newFilename = `${baseName}_min.${ext}`;

    const compressedFile = new File([compressedBlob], newFilename, {
      type: targetType
    });

    const compressedPreviewUrl = URL.createObjectURL(compressedBlob);

    return {
      originalFile: file,
      originalSize: file.size,
      compressedBlob,
      compressedFile,
      compressedSize: compressedBlob.size,
      savingPercent: Math.max(0, Math.round(((file.size - compressedBlob.size) / file.size) * 100)),
      previewUrl: compressedPreviewUrl,
      filename: newFilename
    };
  } catch (error) {
    console.error('Image compression error:', error);
    throw error;
  }
}

/**
 * Compress multiple images and bundle into a ZIP file
 */
export async function compressImagesToZip(compressedItems, onProgress) {
  const zip = new JSZip();
  const total = compressedItems.length;

  for (let i = 0; i < total; i++) {
    const item = compressedItems[i];
    zip.file(item.filename, item.compressedBlob);

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 80));
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (onProgress) {
      onProgress(80 + Math.round(metadata.percent * 0.2));
    }
  });

  return zipBlob;
}
