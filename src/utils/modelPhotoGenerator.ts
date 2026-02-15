import { supabase } from './supabase';

export interface ModelPhotoOptions {
  flatlayImageUrl: string;
  gender: string;
  bodyType: string;
  occasion?: string;
  revisionImageUrl?: string;
  revisionPrompt?: string;
}

export async function generateModelPhoto(
  options: ModelPhotoOptions
): Promise<{ imageUrl: string; ethnicity: string }> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-model-photo`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(options),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate model photo');
  }

  const result = await response.json();
  return {
    imageUrl: result.imageUrl,
    ethnicity: result.ethnicity,
  };
}

async function compressImageFromUrl(
  imageUrl: string,
  targetSizeKB: number
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Failed to load model image for compression'));
    el.src = imageUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  ctx.drawImage(img, 0, 0);

  const targetBytes = targetSizeKB * 1024;
  let quality = 0.88;

  while (quality >= 0.65) {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => b ? resolve(b) : reject(new Error('Failed to create blob')),
        'image/webp',
        quality
      );
    });

    if (blob.size <= targetBytes) {
      return blob;
    }

    quality -= 0.05;
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => b ? resolve(b) : reject(new Error('Failed to create blob')),
      'image/webp',
      0.65
    );
  });
}

export async function generateAndSaveModelPhoto(
  outfitId: string,
  flatlayImageUrl: string
): Promise<string> {
  const { data: outfit, error: outfitError } = await supabase
    .from('outfits')
    .select('gender, body_type, tpo')
    .eq('id', outfitId)
    .single();

  if (outfitError) throw outfitError;
  if (!outfit) throw new Error('Outfit not found');

  const { imageUrl: rawImageUrl } = await generateModelPhoto({
    flatlayImageUrl,
    gender: outfit.gender,
    bodyType: outfit.body_type,
    occasion: outfit.tpo || undefined,
  });

  let finalUrl = rawImageUrl;

  try {
    const compressedBlob = await compressImageFromUrl(rawImageUrl, 400);

    const fileName = `model-photo-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
    const filePath = `outfits/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, compressedBlob, {
        contentType: 'image/webp',
        cacheControl: '3600',
      });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);
      finalUrl = urlData.publicUrl;
    }
  } catch (compressError) {
    console.error('Model photo compression failed, using original:', compressError);
  }

  const { error: updateError } = await supabase
    .from('outfits')
    .update({
      image_url_on_model: finalUrl,
    })
    .eq('id', outfitId);

  if (updateError) throw updateError;

  return finalUrl;
}

export async function reviseModelPhoto(
  outfitId: string,
  flatlayImageUrl: string,
  currentModelImageUrl: string,
  revisionPrompt: string
): Promise<string> {
  const { data: outfit, error: outfitError } = await supabase
    .from('outfits')
    .select('gender, body_type, tpo')
    .eq('id', outfitId)
    .single();

  if (outfitError) throw outfitError;
  if (!outfit) throw new Error('Outfit not found');

  const { imageUrl: rawImageUrl } = await generateModelPhoto({
    flatlayImageUrl,
    gender: outfit.gender,
    bodyType: outfit.body_type,
    occasion: outfit.tpo || undefined,
    revisionImageUrl: currentModelImageUrl,
    revisionPrompt,
  });

  let finalUrl = rawImageUrl;

  try {
    const compressedBlob = await compressImageFromUrl(rawImageUrl, 400);

    const fileName = `model-photo-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
    const filePath = `outfits/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, compressedBlob, {
        contentType: 'image/webp',
        cacheControl: '3600',
      });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);
      finalUrl = urlData.publicUrl;
    }
  } catch (compressError) {
    console.error('Model photo revision compression failed, using original:', compressError);
  }

  const { error: updateError } = await supabase
    .from('outfits')
    .update({
      image_url_on_model: finalUrl,
    })
    .eq('id', outfitId);

  if (updateError) throw updateError;

  return finalUrl;
}
