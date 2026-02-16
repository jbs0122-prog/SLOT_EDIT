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
        const targetBytes = targetSizeKB * 1024;
        const minBytes = minSizeKB * 1024;

        const { width, height } = calculateDimensions(
          img.width, img.height, maxWidth, maxHeight
        );

        const formats: Array<{ mime: string; bg: string }> = [
          { mime: 'image/webp', bg: 'transparent' },
          { mime: 'image/png', bg: 'transparent' },
          { mime: 'image/jpeg', bg: '#FFFFFF' },
        ];

        let bestBlob: Blob | null = null;

        for (const fmt of formats) {
          let q = 0.92;
          let w = width;
          let h = height;
          let attempts = 0;

          while (attempts < 12) {
            const blob = await createCompressedBlob(img, w, h, q, fmt.mime, fmt.bg);

            if (blob.size >= minBytes && blob.size <= targetBytes) {
              bestBlob = blob;
              break;
            }

            if (blob.size < minBytes) {
              if (!bestBlob || blob.size > bestBlob.size) {
                bestBlob = blob;
              }
              break;
            }

            if (blob.size > targetBytes) {
              if (attempts < 4) {
                q -= 0.1;
              } else if (attempts < 8) {
                q -= 0.05;
                w = Math.floor(w * 0.95);
                h = Math.floor(h * 0.95);
              } else {
                w = Math.floor(w * 0.9);
                h = Math.floor(h * 0.9);
                q = Math.max(0.3, q - 0.05);
              }
            }

            attempts++;
          }

          if (bestBlob && bestBlob.size >= minBytes && bestBlob.size <= targetBytes) {
            break;
          }
        }

        if (!bestBlob) {
          throw new Error('이미지 압축 실패');
        }

        const url = URL.createObjectURL(bestBlob);
        const compressionRatio = originalSize > 0 ? (bestBlob.size / originalSize) * 100 : 0;

        resolve({
          blob: bestBlob,
          url,
          size: bestBlob.size,
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
  format: string = 'image/webp',
  bgColor: string = 'transparent'
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context 생성 실패');
  }

  if (bgColor !== 'transparent') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }
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
