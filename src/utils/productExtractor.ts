export interface DetectedItem {
  slot: string;
  label: string;
  color: string;
  description: string;
}

export interface ExtractedProduct {
  imageUrl: string;
  slot: string;
  label: string;
}

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-products`;

const headers = {
  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export async function detectItemsInPhoto(imageUrl: string): Promise<DetectedItem[]> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ mode: 'detect', imageUrl }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to detect items');
  }

  const data = await response.json();
  if (!data.success) throw new Error('Detection failed');
  return data.items;
}

export async function extractProductImage(
  imageUrl: string,
  slot: string,
  label: string
): Promise<ExtractedProduct> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ mode: 'extract', imageUrl, slot, label }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to extract product');
  }

  const data = await response.json();
  if (!data.success) throw new Error('Extraction failed');
  return { imageUrl: data.imageUrl, slot: data.slot, label: data.label };
}
