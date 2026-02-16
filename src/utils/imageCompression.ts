export interface CompressionResult {
  blob: Blob;
  url: string;
  size: number;
  originalSize: number;
  compressionRatio: number;
}

export async function compressImageToTarget(
  imageUrl: string,
  targetSizeKB: number = 100,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  minSizeKB: number = 0
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onerror = () => reject(new Error('이미지 로드 실패'));

    img.onload = async () => {
      try {
        const originalSize = await getImageSize(imageUrl);

        let { width, height } = calculateDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );

        let quality = 0.92;
        let blob: Blob | null = null;
        let attempts = 0;
        const maxAttempts = 15;
        const targetBytes = targetSizeKB * 1024;
        const minBytes = minSizeKB * 1024;
        let format: 'image/webp' | 'image/png' = 'image/webp';

        while (attempts < maxAttempts) {
          blob = await createCompressedBlob(img, width, height, quality, format);

          if (blob.size >= minBytes && blob.size <= targetBytes) {
            break;
          }

          if (blob.size < minBytes && format === 'image/webp') {
            format = 'image/png';
            quality = 0.92;
            attempts++;
            continue;
          }

          if (blob.size < minBytes && format === 'image/png') {
            break;
          }

          if (blob.size > targetBytes) {
            if (format === 'image/png') {
              format = 'image/webp';
              quality = 0.92;
              attempts++;
              continue;
            }
            if (attempts < 5) {
              quality -= 0.1;
            } else if (attempts < 10) {
              quality -= 0.05;
              const scale = 0.95;
              width = Math.floor(width * scale);
              height = Math.floor(height * scale);
            } else {
              const scale = 0.9;
              width = Math.floor(width * scale);
              height = Math.floor(height * scale);
              quality = Math.max(0.3, quality - 0.05);
            }
          }

          attempts++;
        }

        if (!blob) {
          throw new Error('이미지 압축 실패');
        }

        const url = URL.createObjectURL(blob);
        const compressionRatio = originalSize > 0 ? (blob.size / originalSize) * 100 : 0;

        resolve({
          blob,
          url,
          size: blob.size,
          originalSize,
          compressionRatio,
        });
      } catch (error) {
        reject(error);
      }
    };

    img.src = imageUrl;
  });
}

function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  return { width: Math.floor(width), height: Math.floor(height) };
}

async function createCompressedBlob(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
  format: string = 'image/webp'
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context 생성 실패');
  }

  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Blob 생성 실패'));
        }
      },
      format,
      format === 'image/png' ? undefined : quality
    );
  });
}

async function getImageSize(url: string): Promise<number> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return blob.size;
  } catch {
    return 0;
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
