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
  name?: string;
  skipBgRemoval?: boolean;
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

function computeEdgeMap(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  const edges = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const tl = gray[(y - 1) * w + (x - 1)];
      const tc = gray[(y - 1) * w + x];
      const tr = gray[(y - 1) * w + (x + 1)];
      const ml = gray[y * w + (x - 1)];
      const mr = gray[y * w + (x + 1)];
      const bl = gray[(y + 1) * w + (x - 1)];
      const bc = gray[(y + 1) * w + x];
      const br = gray[(y + 1) * w + (x + 1)];

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      edges[y * w + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return edges;
}

function removeWhiteBackground(img: HTMLImageElement): HTMLCanvasElement {
  const tempCanvas = document.createElement('canvas');
  const w = img.width;
  const h = img.height;
  tempCanvas.width = w;
  tempCanvas.height = h;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
  tempCtx.drawImage(img, 0, 0);

  const imageData = tempCtx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const whiteThreshold = 230;
  const edgeSoftness = 25;
  const edgeStrengthThreshold = 30;

  const edgeMap = computeEdgeMap(data, w, h);

  const isWhitish = (idx: number) => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    if (a < 10) return true;
    return r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold;
  };

  const isSemiWhite = (idx: number) => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const brightness = (r + g + b) / 3;
    const minCh = Math.min(r, g, b);
    return brightness > (whiteThreshold - edgeSoftness) && minCh > (whiteThreshold - edgeSoftness * 2);
  };

  const visited = new Uint8Array(w * h);
  const background = new Uint8Array(w * h);

  const queue: number[] = [];

  for (let x = 0; x < w; x++) {
    const topIdx = x * 4;
    const botIdx = ((h - 1) * w + x) * 4;
    if (isWhitish(topIdx)) { queue.push(x); visited[x] = 1; background[x] = 1; }
    const botPx = (h - 1) * w + x;
    if (isWhitish(botIdx)) { queue.push(botPx); visited[botPx] = 1; background[botPx] = 1; }
  }
  for (let y = 1; y < h - 1; y++) {
    const leftPx = y * w;
    const rightPx = y * w + (w - 1);
    if (isWhitish(leftPx * 4)) { queue.push(leftPx); visited[leftPx] = 1; background[leftPx] = 1; }
    if (isWhitish(rightPx * 4)) { queue.push(rightPx); visited[rightPx] = 1; background[rightPx] = 1; }
  }

  while (queue.length > 0) {
    const px = queue.shift()!;
    const x = px % w;
    const y = (px - x) / w;

    const neighbors = [
      y > 0 ? px - w : -1,
      y < h - 1 ? px + w : -1,
      x > 0 ? px - 1 : -1,
      x < w - 1 ? px + 1 : -1,
    ];

    for (const npx of neighbors) {
      if (npx < 0 || visited[npx]) continue;
      visited[npx] = 1;

      if (edgeMap[npx] > edgeStrengthThreshold) continue;

      const idx = npx * 4;
      if (isWhitish(idx)) {
        background[npx] = 1;
        queue.push(npx);
      }
    }
  }

  for (let px = 0; px < w * h; px++) {
    const idx = px * 4;
    if (background[px]) {
      data[idx + 3] = 0;
    } else if (isSemiWhite(idx)) {
      const x = px % w;
      const y = (px - x) / w;
      let nearBg = false;
      for (let dy = -2; dy <= 2 && !nearBg; dy++) {
        for (let dx = -2; dx <= 2 && !nearBg; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && background[ny * w + nx]) {
            nearBg = true;
          }
        }
      }
      if (nearBg) {
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const dist = whiteThreshold - brightness;
        const alpha = Math.min(255, Math.max(0, Math.round((dist / edgeSoftness) * 255)));
        data[idx + 3] = Math.min(data[idx + 3], alpha);
      }
    }
  }

  tempCtx.putImageData(imageData, 0, 0);
  return tempCanvas;
}

interface SlotBoundingBox {
  cx: number;
  cy: number;
  maxWidth: number;
  maxHeight: number;
  rotation: number;
  zIndex: number;
}

function getSlotConfigs(canvasWidth: number, canvasHeight: number): Record<string, SlotBoundingBox> {
  const w = canvasWidth;
  const h = canvasHeight;

  return {
    outer:       { cx: w * 0.26, cy: h * 0.28, maxWidth: w * 0.48, maxHeight: h * 0.50, rotation: 0, zIndex: 1 },
    top:         { cx: w * 0.68, cy: h * 0.22, maxWidth: w * 0.39, maxHeight: h * 0.35, rotation: 0, zIndex: 2 },
    mid:         { cx: w * 0.50, cy: h * 0.26, maxWidth: w * 0.41, maxHeight: h * 0.37, rotation: 0, zIndex: 3 },
    bottom:      { cx: w * 0.65, cy: h * 0.58, maxWidth: w * 0.41, maxHeight: h * 0.44, rotation: 0, zIndex: 4 },
    shoes:       { cx: w * 0.22, cy: h * 0.74, maxWidth: w * 0.35, maxHeight: h * 0.25, rotation: 0, zIndex: 5 },
    bag:         { cx: w * 0.78, cy: h * 0.78, maxWidth: w * 0.30, maxHeight: h * 0.30, rotation: 0, zIndex: 6 },
    accessory:   { cx: w * 0.18, cy: h * 0.54, maxWidth: w * 0.21, maxHeight: h * 0.16, rotation: 0, zIndex: 7 },
    accessory_2: { cx: w * 0.46, cy: h * 0.88, maxWidth: w * 0.18, maxHeight: h * 0.14, rotation: 0, zIndex: 8 },
    necktie:     { cx: w * 0.88, cy: h * 0.42, maxWidth: w * 0.14, maxHeight: h * 0.25, rotation: 0, zIndex: 9 },
  };
}

function fitImageToBox(
  imgWidth: number,
  imgHeight: number,
  box: SlotBoundingBox
): { x: number; y: number; width: number; height: number } {
  const scaleX = box.maxWidth / imgWidth;
  const scaleY = box.maxHeight / imgHeight;
  const scale = Math.min(scaleX, scaleY);

  const width = imgWidth * scale;
  const height = imgHeight * scale;

  return {
    x: box.cx - width / 2,
    y: box.cy - height / 2,
    width,
    height,
  };
}

async function calculateLayoutWithImages(
  items: Array<{ slot_type: string; image_url: string; product_id: string; price?: number | null; name?: string; skipBgRemoval?: boolean }>,
  canvasWidth: number,
  canvasHeight: number,
  _padding: number,
  useProxy: boolean
): Promise<ProductPosition[]> {
  const positions: ProductPosition[] = [];
  const slotConfigs = getSlotConfigs(canvasWidth, canvasHeight);

  const sortedItems = [...items].sort((a, b) => {
    const aZ = slotConfigs[a.slot_type]?.zIndex ?? 999;
    const bZ = slotConfigs[b.slot_type]?.zIndex ?? 999;
    return aZ - bZ;
  });

  for (const item of sortedItems) {
    const box = slotConfigs[item.slot_type];

    try {
      const img = await loadImageWithProxy(item.image_url, useProxy);

      if (!box) {
        const fallback: SlotBoundingBox = {
          cx: canvasWidth / 2, cy: canvasHeight / 2,
          maxWidth: canvasWidth * 0.18, maxHeight: canvasHeight * 0.14,
          rotation: 0, zIndex: 999,
        };
        const fit = fitImageToBox(img.width, img.height, fallback);
        positions.push({
          product_id: item.product_id, image_url: item.image_url, slot_type: item.slot_type,
          ...fit, rotation: 0, price: item.price, name: item.name, skipBgRemoval: item.skipBgRemoval,
        });
        continue;
      }

      const fit = fitImageToBox(img.width, img.height, box);
      positions.push({
        product_id: item.product_id, image_url: item.image_url, slot_type: item.slot_type,
        ...fit, rotation: box.rotation, price: item.price, name: item.name, skipBgRemoval: item.skipBgRemoval,
      });
    } catch (error) {
      console.error(`Failed to load image for ${item.slot_type}:`, error);
      const fallbackBox = box || {
        cx: canvasWidth / 2, cy: canvasHeight / 2,
        maxWidth: canvasWidth * 0.18, maxHeight: canvasHeight * 0.14,
        rotation: 0, zIndex: 999,
      };
      positions.push({
        product_id: item.product_id, image_url: item.image_url, slot_type: item.slot_type,
        x: fallbackBox.cx - fallbackBox.maxWidth / 2, y: fallbackBox.cy - fallbackBox.maxHeight / 2,
        width: fallbackBox.maxWidth, height: fallbackBox.maxHeight,
        rotation: fallbackBox.rotation, price: item.price, name: item.name, skipBgRemoval: item.skipBgRemoval,
      });
    }
  }

  return positions;
}

const SLOT_CATEGORY_LABELS: Record<string, string> = {
  outer: 'Outer',
  top: 'Top',
  mid: 'Mid Layer',
  bottom: 'Bottom',
  shoes: 'Shoes',
  bag: 'Bag',
  accessory: 'Accessory',
  accessory_2: 'Accessory',
  necktie: 'Necktie',
};

function drawPriceLabel(
  ctx: CanvasRenderingContext2D,
  position: ProductPosition,
  canvasWidth: number
) {
  if (!position.price) return;

  const categoryText = SLOT_CATEGORY_LABELS[position.slot_type] || position.slot_type;
  const priceText = `$${position.price.toLocaleString()}`;
  const fontSize = Math.round(canvasWidth * 0.022);
  const categoryFontSize = Math.round(fontSize * 0.72);
  const paddingX = fontSize * 0.7;
  const paddingY = fontSize * 0.45;
  const borderRadius = fontSize * 0.35;
  const lineGap = fontSize * 0.18;
  const pinOffset = Math.round(canvasWidth * 0.022);

  ctx.save();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.font = `500 ${categoryFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const categoryWidth = ctx.measureText(categoryText).width;

  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const priceWidth = ctx.measureText(priceText).width;

  const contentWidth = Math.max(priceWidth, categoryWidth);
  const boxWidth = contentWidth + paddingX * 2;
  const boxHeight = categoryFontSize + lineGap + fontSize + paddingY * 2;

  const pinCenterX = position.x + position.width / 2;
  const pinCenterY = position.y + position.height / 2;

  const boxX = pinCenterX - boxWidth / 2;
  const boxY = pinCenterY + pinOffset;

  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, borderRadius);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fill();

  ctx.textAlign = 'center';
  const centerX = boxX + boxWidth / 2;

  ctx.font = `500 ${categoryFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.textBaseline = 'top';
  ctx.fillText(categoryText, centerX, boxY + paddingY);

  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.textBaseline = 'top';
  ctx.fillText(priceText, centerX, boxY + paddingY + categoryFontSize + lineGap);

  ctx.restore();
}

async function compressCanvasToTarget(
  canvas: HTMLCanvasElement,
  targetSizeKB: number,
  isForAI: boolean = false
): Promise<Blob> {
  const targetBytes = targetSizeKB * 1024;
  let quality = isForAI ? 0.90 : 0.85;
  const minQuality = isForAI ? 0.75 : 0.3;

  while (quality >= minQuality) {
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
      minQuality
    );
  });
}

export async function renderFlatlay(
  items: Array<{ slot_type: string; image_url: string; product_id: string; price?: number | null; name?: string; skipBgRemoval?: boolean }>,
  options: RenderOptions = {}
): Promise<{ imageBlob: Blob; cleanBlob: Blob; positions: ProductPosition[] }> {
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
      const drawSource = position.skipBgRemoval ? img : removeWhiteBackground(img);

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

      ctx.drawImage(drawSource, position.x, position.y, position.width, position.height);

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

  const cleanBlob = await compressCanvasToTarget(canvas, 600, true);

  for (const position of positions) {
    drawPriceLabel(ctx, position, opts.canvasWidth);
  }

  const imageBlob = await compressCanvasToTarget(canvas, 300, false);

  return { imageBlob, cleanBlob, positions: pinsWithPercentages };
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
      const drawSource = position.skipBgRemoval ? img : removeWhiteBackground(img);

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

      ctx.drawImage(drawSource, position.x, position.y, position.width, position.height);

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

  return compressCanvasToTarget(canvas, 300, false);
}

export async function generateAndSaveFlatlay(
  outfitId: string,
  items: Array<{ slot_type: string; image_url: string; product_id: string; price?: number | null; name?: string; skipBgRemoval?: boolean }>,
  options: RenderOptions = {}
): Promise<{ imageUrl: string; cleanImageUrl: string; positions: ProductPosition[] }> {
  const { imageBlob, cleanBlob, positions } = await renderFlatlay(items, options);

  const timestamp = Date.now();

  const cleanFileName = `flatlay_clean_${outfitId}_${timestamp}.webp`;
  const cleanFilePath = `outfits/${cleanFileName}`;

  const { error: cleanUploadError } = await supabase.storage
    .from('product-images')
    .upload(cleanFilePath, cleanBlob, {
      contentType: 'image/webp',
      cacheControl: '3600',
    });

  if (cleanUploadError) throw cleanUploadError;

  const { data: cleanUrlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(cleanFilePath);

  const fileName = `flatlay_${outfitId}_${timestamp}.webp`;
  const filePath = `outfits/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, imageBlob, {
      contentType: 'image/webp',
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
    cleanImageUrl: cleanUrlData.publicUrl,
    positions,
  };
}
