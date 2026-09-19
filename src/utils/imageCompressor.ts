/**
 * Utility for client-side image compression and validation before sending to AI or Cloud Storage.
 * Protects mobile memory (Safari/Chrome), saves bandwidth, and respects API payload limits.
 */

export interface CompressionResult {
  file: File;
  base64: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  width: number;
  height: number;
}

export const MAX_UPLOAD_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_IMAGE_DIMENSION_PX = 1920; // Max 1920px on the longest side
export const JPEG_QUALITY = 0.82; // Balanced for OCR readability and compact file size

/**
 * Validates file size against MAX_UPLOAD_FILE_SIZE_BYTES
 */
export function validateFileSize(file: File, maxSizeBytes = MAX_UPLOAD_FILE_SIZE_BYTES): { valid: boolean; error?: string } {
  if (file.size > maxSizeBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `Fotografie je příliš velká (${sizeMb} MB). Maximální povolená velikost je ${maxMb} MB.`,
    };
  }
  return { valid: true };
}

/**
 * Compresses and resizes an image file in the browser using HTMLCanvasElement.
 * Returns both the compressed File (for Supabase Storage) and Base64 data URL (for AI Vision API).
 */
export async function compressAndPrepareImage(
  file: File,
  maxDimension = MAX_IMAGE_DIMENSION_PX,
  quality = JPEG_QUALITY
): Promise<CompressionResult> {
  // Check file size limit first
  const validation = validateFileSize(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Nepodařilo se načíst soubor z fotoaparátu/zařízení.'));
    };

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Chyba při čtení dat obrázku.'));
        return;
      }

      const img = new Image();

      img.onerror = () => {
        reject(new Error('Vybraný soubor není platný formát obrázku.'));
      };

      img.onload = () => {
        try {
          let { width, height } = img;

          // Downscale if larger than max dimension while preserving aspect ratio
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback to original if 2D context is unavailable
            resolve({
              file,
              base64: reader.result as string,
              originalSizeBytes: file.size,
              compressedSizeBytes: file.size,
              width: img.width,
              height: img.height,
            });
            return;
          }

          // Smooth scaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw white background in case of transparent PNG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          // Draw image
          ctx.drawImage(img, 0, 0, width, height);

          // Export as compressed JPEG base64
          const base64 = canvas.toDataURL('image/jpeg', quality);

          // Convert to Blob and File
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                // Fallback
                resolve({
                  file,
                  base64,
                  originalSizeBytes: file.size,
                  compressedSizeBytes: file.size,
                  width,
                  height,
                });
                return;
              }

              const cleanBaseName = file.name.replace(/\.[^/.]+$/, '');
              const compressedFile = new File([blob], `${cleanBaseName}.jpg`, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });

              resolve({
                file: compressedFile,
                base64,
                originalSizeBytes: file.size,
                compressedSizeBytes: compressedFile.size,
                width,
                height,
              });
            },
            'image/jpeg',
            quality
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          reject(new Error(`Chyba při kompresi obrázku: ${msg}`));
        }
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}
