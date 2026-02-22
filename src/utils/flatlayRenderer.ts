import { supabase } from './supabase';
import { removeBackground } from './backgroundRemoval';

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

export interface EditorProductData {
  product_id: string;
  processedImageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  slot_type: string;
  price?: number | null;
  name?: string;
  aspectRatio: number;
  zOrder?: number;
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

async function removeWhiteBackgroundViaApi(imageUrl: string, productId: string): Promise<string> {
  try {
    const nobgUrl = await removeBackground(imageUrl, productId);
    console.log(`Background removed for product ${productId}: ${nobgUrl}`);
    return nobgUrl;
  } catch (error) {
    console.error(`Pixian API bg removal failed for product ${productId}, using original:`, error);
    return imageUrl;
  }
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
    outer:       { cx: w * 0.26, cy: h * 0.28, maxWidth: w * 0.56, maxHeight: h * 0.58, rotation: 0, zIndex: 1 },
    top:         { cx: w * 0.68, cy: h * 0.22, maxWidth: w * 0.46, maxHeight: h * 0.42, rotation: 0, zIndex: 2 },
    mid:         { cx: w * 0.50, cy: h * 0.26, maxWidth: w * 0.48, maxHeight: h * 0.44, rotation: 0, zIndex: 3 },
    bottom:      { cx: w * 0.65, cy: h * 0.58, maxWidth: w * 0.48, maxHeight: h * 0.52, rotation: 0, zIndex: 4 },
    shoes:       { cx: w * 0.22, cy: h * 0.74, maxWidth: w * 0.40, maxHeight: h * 0.30, rotation: 0, zIndex: 5 },
    bag:         { cx: w * 0.78, cy: h * 0.78, maxWidth: w * 0.36, maxHeight: h * 0.36, rotation: 0, zIndex: 6 },
    accessory:   { cx: w * 0.18, cy: h * 0.54, maxWidth: w * 0.24, maxHeight: h * 0.20, rotation: 0, zIndex: 7 },
    accessory_2: { cx: w * 0.46, cy: h * 0.88, maxWidth: w * 0.22, maxHeight: h * 0.18, rotation: 0, zIndex: 8 },
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

  const processedUrls = new Map<string, string>();
  for (const position of positions) {
    if (!position.skipBgRemoval) {
      const nobgUrl = await removeWhiteBackgroundViaApi(position.image_url, position.product_id);
      processedUrls.set(position.product_id, nobgUrl);
    }
  }

  for (const position of positions) {
    try {
      const imageUrl = position.skipBgRemoval
        ? position.image_url
        : (processedUrls.get(position.product_id) || position.image_url);
      const img = await loadImageWithProxy(imageUrl, opts.useProxy);

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

  const cleanBlob = await compressCanvasToTarget(canvas, 600, true);

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

  const processedUrls = new Map<string, string>();
  for (const position of positions) {
    if (!position.skipBgRemoval) {
      const nobgUrl = await removeWhiteBackgroundViaApi(position.image_url, position.product_id);
      processedUrls.set(position.product_id, nobgUrl);
    }
  }

  for (const position of positions) {
    try {
      const imageUrl = position.skipBgRemoval
        ? position.image_url
        : (processedUrls.get(position.product_id) || position.image_url);
      const img = await loadImageWithProxy(imageUrl, opts.useProxy);

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

export async function prepareFlatlayForEditor(
  items: Array<{ slot_type: string; image_url: string; product_id: string; price?: number | null; name?: string; skipBgRemoval?: boolean }>,
  options: RenderOptions = {},
  onProgress?: (step: string) => void
): Promise<EditorProductData[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  onProgress?.('레이아웃 계산 중...');
  const positions = await calculateLayoutWithImages(
    items, opts.canvasWidth, opts.canvasHeight, opts.padding, opts.useProxy
  );

  onProgress?.('배경 제거 중...');
  const processedUrls = new Map<string, string>();
  for (const position of positions) {
    if (!position.skipBgRemoval) {
      const nobgUrl = await removeWhiteBackgroundViaApi(position.image_url, position.product_id);
      processedUrls.set(position.product_id, nobgUrl);
    }
  }

  onProgress?.('에디터 준비 중...');
  const editorData: EditorProductData[] = [];
  for (const position of positions) {
    const imageUrl = position.skipBgRemoval
      ? position.image_url
      : (processedUrls.get(position.product_id) || position.image_url);

    let aspectRatio = position.width / position.height;
    try {
      const img = await loadImageWithProxy(imageUrl, opts.useProxy);
      aspectRatio = img.width / img.height;
    } catch { /* use calculated ratio */ }

    editorData.push({
      product_id: position.product_id,
      processedImageUrl: imageUrl,
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height,
      rotation: position.rotation,
      slot_type: position.slot_type,
      price: position.price,
      name: position.name,
      aspectRatio,
    });
  }

  return editorData;
}

export async function renderFlatlayFromEditorData(
  editorData: EditorProductData[],
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

  const sorted = [...editorData].sort(
    (a, b) => (a.zOrder ?? 0) - (b.zOrder ?? 0)
  );

  for (const item of sorted) {
    try {
      const img = await loadImageWithProxy(item.processedImageUrl, opts.useProxy);
      ctx.save();

      const imgAspect = img.naturalWidth / img.naturalHeight;
      const boxAspect = item.width / item.height;
      let drawW: number, drawH: number, drawX: number, drawY: number;
      if (Math.abs(imgAspect - boxAspect) < 0.01) {
        drawW = item.width;
        drawH = item.height;
        drawX = item.x;
        drawY = item.y;
      } else if (imgAspect > boxAspect) {
        drawW = item.width;
        drawH = item.width / imgAspect;
        drawX = item.x;
        drawY = item.y + (item.height - drawH) / 2;
      } else {
        drawH = item.height;
        drawW = item.height * imgAspect;
        drawY = item.y;
        drawX = item.x + (item.width - drawW) / 2;
      }

      if (item.rotation) {
        const cx = item.x + item.width / 2;
        const cy = item.y + item.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 25;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 6;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    } catch (error) {
      console.error(`Failed to render ${item.slot_type}:`, error);
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(item.x, item.y, item.width, item.height);
    }
  }

  const positions: ProductPosition[] = sorted.map(item => ({
    product_id: item.product_id,
    image_url: item.processedImageUrl,
    x: ((item.x + item.width / 2) / opts.canvasWidth) * 100,
    y: ((item.y + item.height / 2) / opts.canvasHeight) * 100,
    width: item.width,
    height: item.height,
    rotation: item.rotation,
    slot_type: item.slot_type,
    price: item.price,
    name: item.name,
    skipBgRemoval: true,
  }));

  const cleanBlob = await compressCanvasToTarget(canvas, 600, true);

  try {
    const logoImg = await loadImageWithProxy('/logo(white).png', false);
    const logoWidth = 616;
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
    const logoX = (canvas.width - logoWidth) / 2;
    const logoY = (canvas.height - logoHeight) / 2;
    ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
  } catch { /* skip logo */ }

  for (const item of sorted) {
    drawPriceLabel(ctx, {
      product_id: item.product_id,
      image_url: item.processedImageUrl,
      x: item.x, y: item.y,
      width: item.width, height: item.height,
      slot_type: item.slot_type,
      price: item.price, name: item.name,
    }, opts.canvasWidth);
  }

  const imageBlob = await compressCanvasToTarget(canvas, 300, false);

  return { imageBlob, cleanBlob, positions };
}

export async function saveFlatlayToStorage(
  outfitId: string,
  imageBlob: Blob,
  cleanBlob: Blob,
  positions: ProductPosition[]
): Promise<{ imageUrl: string; cleanImageUrl: string }> {
  const timestamp = Date.now();

  const cleanFilePath = `outfits/flatlay_clean_${outfitId}_${timestamp}.webp`;
  const { error: cleanUploadError } = await supabase.storage
    .from('product-images')
    .upload(cleanFilePath, cleanBlob, { contentType: 'image/webp', cacheControl: '3600' });
  if (cleanUploadError) throw cleanUploadError;

  const { data: cleanUrlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(cleanFilePath);

  const filePath = `outfits/flatlay_${outfitId}_${timestamp}.webp`;
  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, imageBlob, { contentType: 'image/webp', cacheControl: '3600' });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  const { error: updateError } = await supabase
    .from('outfits')
    .update({
      image_url_flatlay: urlData.publicUrl,
      image_url_flatlay_clean: cleanUrlData.publicUrl,
      flatlay_pins: positions,
      status: 'completed',
    })
    .eq('id', outfitId);
  if (updateError) throw updateError;

  return { imageUrl: urlData.publicUrl, cleanImageUrl: cleanUrlData.publicUrl };
}

export function reconstructEditorDataFromPins(
  savedPins: ProductPosition[],
  canvasWidth: number = 1200,
  canvasHeight: number = 1400
): EditorProductData[] {
  return savedPins.map(pin => ({
    product_id: pin.product_id,
    processedImageUrl: pin.image_url,
    x: (pin.x / 100) * canvasWidth - pin.width / 2,
    y: (pin.y / 100) * canvasHeight - pin.height / 2,
    width: pin.width,
    height: pin.height,
    rotation: pin.rotation,
    slot_type: pin.slot_type,
    price: pin.price,
    name: pin.name,
    aspectRatio: pin.width / pin.height,
  }));
}
