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
  price?: number | null;
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
  backgroundColor: '#e8e0d5',
  padding: 50,
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

function removeWhiteBackground(img: HTMLImageElement): HTMLCanvasElement {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
  tempCtx.drawImage(img, 0, 0);

  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;

  const whiteThreshold = 235;
  const edgeSoftness = 20;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold) {
      data[i + 3] = 0;
    } else {
      const minChannel = Math.min(r, g, b);
      const brightness = (r + g + b) / 3;

      if (brightness > (whiteThreshold - edgeSoftness) && minChannel > (whiteThreshold - edgeSoftness * 2)) {
        const distFromThreshold = whiteThreshold - brightness;
        const alpha = Math.min(255, Math.max(0, Math.round((distFromThreshold / edgeSoftness) * 255)));
        data[i + 3] = Math.min(data[i + 3], alpha);
      }
    }
  }

  tempCtx.putImageData(imageData, 0, 0);
  return tempCanvas;
}

async function calculateLayoutWithImages(
  items: Array<{ slot_type: string; image_url: string; product_id: string; price?: number | null }>,
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
      maxSize: Math.min(availableWidth, availableHeight) * 0.65,
      offsetX: -availableWidth * 0.20,
      offsetY: -availableHeight * 0.18,
      rotation: 0,
      zIndex: 1,
    },
    top: {
      maxSize: Math.min(availableWidth, availableHeight) * 0.48,
      offsetX: availableWidth * 0.18,
      offsetY: -availableHeight * 0.22,
      rotation: 0,
      zIndex: 2,
    },
    mid: {
      maxSize: Math.min(availableWidth, availableHeight) * 0.55,
      offsetX: -availableWidth * 0.02,
      offsetY: -availableHeight * 0.16,
      rotation: 0,
      zIndex: 3,
    },
    bottom: {
      maxSize: Math.min(availableWidth, availableHeight) * 0.60,
      offsetX: availableWidth * 0.22,
      offsetY: availableHeight * 0.10,
      rotation: 0,
      zIndex: 4,
    },
    shoes: {
      maxSize: Math.min(availableWidth, availableHeight) * 0.42,
      offsetX: -availableWidth * 0.22,
      offsetY: availableHeight * 0.28,
      rotation: 0,
      zIndex: 5,
    },
    bag: {
      maxSize: Math.min(availableWidth, availableHeight) * 0.42,
      offsetX: availableWidth * 0.25,
      offsetY: availableHeight * 0.30,
      rotation: 0,
      zIndex: 6,
    },
    accessory: {
      maxSize: Math.min(availableWidth, availableHeight) * 0.30,
      offsetX: -availableWidth * 0.30,
      offsetY: availableHeight * 0.15,
      rotation: 0,
      zIndex: 7,
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
          price: item.price,
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
        price: item.price,
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
        price: item.price,
      });
    }
  }

  return positions;
}

function drawPriceLabel(
  ctx: CanvasRenderingContext2D,
  position: ProductPosition,
  canvasWidth: number
) {
  if (!position.price) return;

  const priceText = `₩${position.price.toLocaleString()}`;
  const fontSize = Math.round(canvasWidth * 0.018);
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

  const textMetrics = ctx.measureText(priceText);
  const paddingX = fontSize * 0.5;
  const paddingY = fontSize * 0.35;
  const boxWidth = textMetrics.width + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;
  const borderRadius = fontSize * 0.3;

  const boxX = position.x + position.width - boxWidth - 4;
  const boxY = position.y + position.height - boxHeight - 4;

  ctx.save();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(priceText, boxX + boxWidth / 2, boxY + boxHeight / 2);

  ctx.restore();
}

export async function renderFlatlay(
  items: Array<{ slot_type: string; image_url: string; product_id: string; price?: number | null }>,
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
      const processedImg = removeWhiteBackground(img);

      ctx.save();

      if (position.rotation) {
        const centerX = position.x + position.width / 2;
        const centerY = position.y + position.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((position.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }

      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 25;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 6;

      ctx.drawImage(processedImg, position.x, position.y, position.width, position.height);

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

  for (const position of positions) {
    drawPriceLabel(ctx, position, opts.canvasWidth);
  }

  try {
    const logoImg = await loadImageWithProxy('/logo(white).png', false);
    const logoWidth = 616;
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
    const logoX = (canvas.width - logoWidth) / 2;
    const logoY = (canvas.height - logoHeight) / 2;

    ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
  } catch (error) {
    console.error('Failed to load logo:', error);
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
      const processedImg = removeWhiteBackground(img);

      ctx.save();

      if (position.rotation) {
        const centerX = position.x + position.width / 2;
        const centerY = position.y + position.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((position.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }

      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 25;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 6;

      ctx.drawImage(processedImg, position.x, position.y, position.width, position.height);

      ctx.restore();
    } catch (error) {
      console.error(`Failed to load image for ${position.slot_type}:`, error);

      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(position.x, position.y, position.width, position.height);
      ctx.strokeStyle = '#9ca3af';
      ctx.strokeRect(position.x, position.y, position.width, position.height);
    }
  }

  try {
    const logoImg = await loadImageWithProxy('/logo(white).png', false);
    const logoWidth = 616;
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
    const logoX = (canvas.width - logoWidth) / 2;
    const logoY = (canvas.height - logoHeight) / 2;

    ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
  } catch (error) {
    console.error('Failed to load logo:', error);
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
  items: Array<{ slot_type: string; image_url: string; product_id: string; price?: number | null }>,
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
