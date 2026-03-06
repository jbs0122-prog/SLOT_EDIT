import { supabase } from './supabase';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

async function compressToWebP(file: File, maxPx: number, targetKB: number): Promise<{ blob: Blob; ext: string }> {
  if (file.type === 'image/gif') {
    return { blob: file, ext: 'gif' };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxPx || h > maxPx) {
        if (w >= h) { h = Math.round((h * maxPx) / w); w = maxPx; }
        else { w = Math.round((w * maxPx) / h); h = maxPx; }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);

      const targetBytes = targetKB * 1024;
      let quality = 0.88;
      let attempts = 0;

      const tryEncode = () => {
        canvas.toBlob((blob) => {
          if (!blob) { resolve({ blob: file, ext: file.name.split('.').pop() || 'jpg' }); return; }
          if (blob.size <= targetBytes || quality <= 0.5 || attempts >= 10) {
            resolve({ blob, ext: 'webp' });
          } else {
            quality = Math.max(0.5, quality - 0.08);
            attempts++;
            tryEncode();
          }
        }, 'image/webp', quality);
      };
      tryEncode();
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ blob: file, ext: file.name.split('.').pop() || 'jpg' });
    };

    img.src = objectUrl;
  });
}

export const uploadProductImage = async (file: File): Promise<ImageUploadResult> => {
  try {
    const { blob, ext } = await compressToWebP(file, 1200, 800);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = `products/${fileName}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: `image/${ext}`,
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);

    return {
      success: true,
      url: publicUrlData.publicUrl,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
};

export const validateImageFile = (file: File): string | null => {
  const maxSize = 5 * 1024 * 1024;
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (!allowedTypes.includes(file.type)) {
    return '지원되는 이미지 형식: JPEG, PNG, WebP, GIF';
  }

  if (file.size > maxSize) {
    return '이미지 크기는 5MB 이하여야 합니다';
  }

  return null;
};

export const uploadProductBlob = async (blob: Blob, extension: string = 'webp'): Promise<ImageUploadResult> => {
  try {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    const filePath = `products/${fileName}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: `image/${extension}`,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);

    return { success: true, url: publicUrlData.publicUrl };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

export const deleteProductImage = async (imageUrl: string): Promise<boolean> => {
  try {
    const urlParts = imageUrl.split('/product-images/');
    if (urlParts.length < 2) {
      return false;
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
};
