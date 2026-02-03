import { supabase } from './supabase';

export interface ProductPosition {
  product_id: string;
  image_url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  slot_type: string;
}

export interface RenderOptions {
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  padding?: number;
  useProxy?: boolean;
}

const DEFAULT_OPTIONS: Required<RenderOptions> = {
  canvasWidth: 800,
  canvasHeight: 1000,
  backgroundColor: '#f8f9fa',
  padding: 40,
  useProxy: true,
};

async function loadImageWithProxy(url: string, useProxy: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));

    if (useProxy && !url.startsWith('data:')) {
      const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-ibb-image?url=${encodeURIComponent(url)}`;
      img.src = proxyUrl;
    } else {
      img.src = url;
    }
  });
}

function calculateLayout(
  items: Array<{ slot_type: string; image_url: string; product_id: string }>,
  canvasWidth: number,
  canvasHeight: number,
  padding: number
): ProductPosition[] {
  const positions: ProductPosition[] = [];

  const slotOrder = ['outer', 'top', 'bottom', 'shoes', 'bag', 'accessory'];
  const sortedItems = items.sort((a, b) => {
    return slotOrder.indexOf(a.slot_type) - slotOrder.indexOf(b.slot_type);
  });

  const availableWidth = canvasWidth - padding * 2;
  const availableHeight = canvasHeight - padding * 2;

  const cols = sortedItems.length <= 3 ? sortedItems.length : 3;
  const rows = Math.ceil(sortedItems.length / cols);

  const cellWidth = availableWidth / cols;
  const cellHeight = availableHeight / rows;

  const itemSize = Math.min(cellWidth, cellHeight) * 0.8;

  sortedItems.forEach((item, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    const cellCenterX = padding + col * cellWidth + cellWidth / 2;
    const cellCenterY = padding + row * cellHeight + cellHeight / 2;

    positions.push({
      product_id: item.product_id,
      image_url: item.image_url,
      slot_type: item.slot_type,
      x: cellCenterX - itemSize / 2,
      y: cellCenterY - itemSize / 2,
      width: itemSize,
      height: itemSize,
      rotation: 0,
    });
  });

  return positions;
}

export async function renderFlatlay(
  items: Array<{ slot_type: string; image_url: string; product_id: string }>,
  options: RenderOptions = {}
): Promise<{ imageBlob: Blob; positions: ProductPosition[] }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const canvas = document.createElement('canvas');
  canvas.width = opts.canvasWidth;
  canvas.height = opts.canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.fillStyle = opts.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const positions = calculateLayout(items, opts.canvasWidth, opts.canvasHeight, opts.padding);

  for (const position of positions) {
    try {
      const img = await loadImageWithProxy(position.image_url, opts.useProxy);

      ctx.save();

      if (position.rotation) {
        const centerX = position.x + position.width / 2;
        const centerY = position.y + position.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((position.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }

      ctx.drawImage(img, position.x, position.y, position.width, position.height);

      ctx.restore();
    } catch (error) {
      console.error(`Failed to load image for ${position.slot_type}:`, error);

      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(position.x, position.y, position.width, position.height);
      ctx.strokeStyle = '#9ca3af';
      ctx.strokeRect(position.x, position.y, position.width, position.height);

      ctx.fillStyle = '#6b7280';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'Image unavailable',
        position.x + position.width / 2,
        position.y + position.height / 2
      );
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({ imageBlob: blob, positions });
        } else {
          reject(new Error('Failed to create image blob'));
        }
      },
      'image/png',
      0.95
    );
  });
}

export async function renderFlatlayWithCustomPositions(
  positions: ProductPosition[],
  options: RenderOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const canvas = document.createElement('canvas');
  canvas.width = opts.canvasWidth;
  canvas.height = opts.canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.fillStyle = opts.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const position of positions) {
    try {
      const img = await loadImageWithProxy(position.image_url, opts.useProxy);

      ctx.save();

      if (position.rotation) {
        const centerX = position.x + position.width / 2;
        const centerY = position.y + position.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((position.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }

      ctx.drawImage(img, position.x, position.y, position.width, position.height);

      ctx.restore();
    } catch (error) {
      console.error(`Failed to load image for ${position.slot_type}:`, error);

      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(position.x, position.y, position.width, position.height);
      ctx.strokeStyle = '#9ca3af';
      ctx.strokeRect(position.x, position.y, position.width, position.height);
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create image blob'));
        }
      },
      'image/png',
      0.95
    );
  });
}

export async function generateAndSaveFlatlay(
  outfitId: string,
  items: Array<{ slot_type: string; image_url: string; product_id: string }>,
  options: RenderOptions = {}
): Promise<{ imageUrl: string; positions: ProductPosition[] }> {
  const { imageBlob, positions } = await renderFlatlay(items, options);

  const fileName = `flatlay_${outfitId}_${Date.now()}.png`;
  const filePath = `outfits/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, imageBlob, {
      contentType: 'image/png',
      cacheControl: '3600',
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from('outfits')
    .update({
      image_url_flatlay: urlData.publicUrl,
      flatlay_pins: positions,
      status: 'completed',
    })
    .eq('id', outfitId);

  if (updateError) throw updateError;

  return {
    imageUrl: urlData.publicUrl,
    positions,
  };
}
