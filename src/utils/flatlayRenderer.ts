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

interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface RenderOptions {
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  padding?: number;
  useProxy?: boolean;
}

const DEFAULT_OPTIONS: Required<RenderOptions> = {
  canvasWidth: 1200,
  canvasHeight: 1400,
  backgroundColor: 'transparent',
  padding: 100,
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

async function calculateLayoutWithImages(
  items: Array<{ slot_type: string; image_url: string; product_id: string }>,
  canvasWidth: number,
  canvasHeight: number,
  padding: number,
  useProxy: boolean
): Promise<ProductPosition[]> {
  const positions: ProductPosition[] = [];

  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  const availableWidth = canvasWidth - padding * 2;
  const availableHeight = canvasHeight - padding * 2;

  const slotConfigs: {
    [key: string]: {
      maxSize: number;
      offsetX: number;
      offsetY: number;
      rotation: number;
      zIndex: number;
    };
  } = {
    outer: {
      maxSize: Math.min(availableWidth, availableHeight) * 0.35,
      offsetX: -availableWidth * 0.2,
      offsetY: -availableHeight * 0.15,
      rotation: -8,
      zIndex: 1,
    },
    top: {
      maxSize: Math.min(availableWidth, availableHeight) * 0.32,
      offsetX: availableWidth * 0.05,
      offsetY: -availableHeight * 0.1,
      rotation: 3,
      zIndex: 2,
    },
    bottom: {
      maxSize: Math.min(availableWidth, availableHeight) * 0.3,
      offsetX: availableWidth * 0.15,
      offsetY: availableHeight * 0.15,
      rotation: -5,
      zIndex: 3,
    },
    shoes: {
      maxSize: Math.min(availableWidth, availableHeight) * 0.25,
      offsetX: -availableWidth * 0.18,
      offsetY: availableHeight * 0.25,
      rotation: 12,
      zIndex: 4,
    },
    bag: {
      maxSize: Math.min(availableWidth, availableHeight) * 0.22,
      offsetX: availableWidth * 0.25,
      offsetY: -availableHeight * 0.22,
      rotation: -10,
      zIndex: 5,
    },
    accessory: {
      maxSize: Math.min(availableWidth, availableHeight) * 0.15,
      offsetX: -availableWidth * 0.28,
      offsetY: -availableHeight * 0.28,
      rotation: 15,
      zIndex: 6,
    },
  };

  const sortedItems = items.sort((a, b) => {
    const aConfig = slotConfigs[a.slot_type] || { zIndex: 999 };
    const bConfig = slotConfigs[b.slot_type] || { zIndex: 999 };
    return aConfig.zIndex - bConfig.zIndex;
  });

  for (const item of sortedItems) {
    const config = slotConfigs[item.slot_type];

    try {
      const img = await loadImageWithProxy(item.image_url, useProxy);
      const aspectRatio = img.width / img.height;

      let width: number;
      let height: number;

      if (!config) {
        const fallbackMaxSize = Math.min(availableWidth, availableHeight) * 0.2;
        if (aspectRatio > 1) {
          width = fallbackMaxSize;
          height = fallbackMaxSize / aspectRatio;
        } else {
          height = fallbackMaxSize;
          width = fallbackMaxSize * aspectRatio;
        }

        positions.push({
          product_id: item.product_id,
          image_url: item.image_url,
          slot_type: item.slot_type,
          x: centerX - width / 2,
          y: centerY - height / 2,
          width,
          height,
          rotation: 0,
        });
        continue;
      }

      if (aspectRatio > 1) {
        width = config.maxSize;
        height = config.maxSize / aspectRatio;
      } else {
        height = config.maxSize;
        width = config.maxSize * aspectRatio;
      }

      const x = centerX + config.offsetX - width / 2;
      const y = centerY + config.offsetY - height / 2;

      positions.push({
        product_id: item.product_id,
        image_url: item.image_url,
        slot_type: item.slot_type,
        x,
        y,
        width,
        height,
        rotation: config.rotation,
      });
    } catch (error) {
      console.error(`Failed to load image for ${item.slot_type}:`, error);
      const fallbackSize = config ? config.maxSize : Math.min(availableWidth, availableHeight) * 0.2;
      const x = centerX + (config?.offsetX || 0) - fallbackSize / 2;
      const y = centerY + (config?.offsetY || 0) - fallbackSize / 2;

      positions.push({
        product_id: item.product_id,
        image_url: item.image_url,
        slot_type: item.slot_type,
        x,
        y,
        width: fallbackSize,
        height: fallbackSize,
        rotation: config?.rotation || 0,
      });
    }
  }

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

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Canvas context not available');

  if (opts.backgroundColor !== 'transparent') {
    ctx.fillStyle = opts.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const positions = await calculateLayoutWithImages(
    items,
    opts.canvasWidth,
    opts.canvasHeight,
    opts.padding,
    opts.useProxy
  );

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

      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 8;

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

  const pinsWithPercentages = positions.map(pos => ({
    ...pos,
    x: ((pos.x + pos.width / 2) / opts.canvasWidth) * 100,
    y: ((pos.y + pos.height / 2) / opts.canvasHeight) * 100,
  }));

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({ imageBlob: blob, positions: pinsWithPercentages });
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

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Canvas context not available');

  if (opts.backgroundColor !== 'transparent') {
    ctx.fillStyle = opts.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

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

      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 8;

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
