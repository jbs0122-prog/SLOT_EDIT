import { Product } from '../../data/outfits';
import { resolveColorFamily, getColorHarmonyScore } from './colorDna';
import { SEASON_WARMTH } from './beamSearch';

export function computeSeasonFit(
  items: Record<string, Product>,
  targetSeason?: string
): number {
  if (!targetSeason) return 50;

  const coreKeys = ['outer', 'mid', 'top', 'bottom', 'shoes'];
  const coreItems = coreKeys.map(k => items[k]).filter(Boolean) as Product[];
  if (coreItems.length < 2) return 50;

  let score = 100;
  let matchCount = 0;
  let mismatchCount = 0;

  for (const item of coreItems) {
    const seasons = item.season || [];
    if (seasons.includes(targetSeason)) {
      matchCount++;
      score += 8;
    } else if (seasons.length === 0) {
      score -= 5;
    } else {
      mismatchCount++;
      score -= 18;
    }
  }

  if (matchCount === coreItems.length) score += 20;
  if (mismatchCount >= Math.ceil(coreItems.length * 0.5)) score -= 25;

  return Math.max(0, Math.min(100, score));
}

export function computeWarmthFit(
  items: Record<string, Product>,
  targetWarmth?: number,
  targetSeason?: string
): number {
  const CLOTHING_KEYS = ['outer', 'mid', 'top', 'bottom'];
  const SHOES_WEIGHT = 0.4;
  let wSum = 0; let wTot = 0;
  for (const [k, prod] of Object.entries(items)) {
    if (!prod || typeof prod.warmth !== 'number') continue;
    if (CLOTHING_KEYS.includes(k)) { wSum += prod.warmth; wTot += 1; }
    else if (k === 'shoes') { wSum += prod.warmth * SHOES_WEIGHT; wTot += SHOES_WEIGHT; }
  }

  if (wTot < 1) return 50;

  let score = 100;
  const avg = wSum / wTot;

  const effectiveTarget = targetWarmth ?? (targetSeason ? SEASON_WARMTH[targetSeason]?.ideal : undefined);

  if (effectiveTarget !== undefined) {
    const diff = Math.abs(avg - effectiveTarget);
    if (diff <= 0.5) score += 15;
    else if (diff <= 1) score += 5;
    else if (diff > 2) score -= 45;
    else if (diff > 1.5) score -= 30;
    else score -= 15;
  }

  if (targetSeason) {
    const bounds = SEASON_WARMTH[targetSeason];
    if (bounds) {
      if (avg < bounds.min) score -= Math.min(30, (bounds.min - avg) * 20);
      if (avg > bounds.max) score -= Math.min(30, (avg - bounds.max) * 20);
    }
  }

  const clothingWarmths = (['outer', 'mid', 'top', 'bottom'] as const)
    .map(k => items[k]?.warmth)
    .filter((w): w is number => typeof w === 'number');
  if (clothingWarmths.length >= 2) {
    const range = Math.max(...clothingWarmths) - Math.min(...clothingWarmths);
    if (range > 2) score -= 20;
    else if (range <= 1) score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

export function computeAccessoryHarmony(items: Record<string, Product>): number {
  const accessories = [items.bag, items.accessory, items.accessory_2].filter(Boolean) as Product[];
  if (accessories.length === 0) return 50;

  const mainKeys = ['outer', 'mid', 'top', 'bottom', 'shoes'];
  const mainItems = mainKeys.map(k => items[k]).filter(Boolean) as Product[];
  const mainColors = mainItems
    .map(p => resolveColorFamily(p.color || '', p.color_family))
    .filter(Boolean);

  if (mainColors.length === 0) return 50;

  let score = 70;
  for (const acc of accessories) {
    const accColor = resolveColorFamily(acc.color || '', acc.color_family);
    if (!accColor) continue;

    let bestHarmony = 0;
    for (const mc of mainColors) {
      bestHarmony = Math.max(bestHarmony, getColorHarmonyScore(mc, accColor));
    }
    if (bestHarmony >= 85) score += 10;
    else if (bestHarmony >= 70) score += 5;
    else if (bestHarmony < 50) score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

export function computeImageFeatureScore(items: Record<string, Product>): number {
  const coreKeys = ['outer', 'mid', 'top', 'bottom', 'shoes'];
  const coreItems = coreKeys.map(k => items[k]).filter(Boolean) as Product[];
  const withFeatures = coreItems.filter(i => i.image_features);
  if (withFeatures.length < 2) return 50;

  let score = 70;

  const textures = withFeatures.map(i => i.image_features!.texture);
  const textureSet = new Set(textures);
  if (textureSet.size <= 2) score += 10;
  if (textureSet.size === 1) score += 5;

  const weights = withFeatures.map(i => i.image_features!.visualWeight);
  const heavyCount = weights.filter(w => w === 'heavy').length;
  const lightCount = weights.filter(w => w === 'light').length;
  if (heavyCount > 0 && lightCount > 0) score += 8;
  if (heavyCount === weights.length || lightCount === weights.length) score -= 5;

  const allStyles = withFeatures.flatMap(i => i.image_features!.styleAttributes);
  const styleCounts = new Map<string, number>();
  allStyles.forEach(s => styleCounts.set(s, (styleCounts.get(s) || 0) + 1));
  if (styleCounts.size > 0) {
    const maxShared = Math.max(...styleCounts.values());
    if (maxShared >= withFeatures.length) score += 15;
    else if (maxShared >= Math.ceil(withFeatures.length * 0.6)) score += 8;
  }

  const brightnesses = withFeatures.map(i => i.image_features!.brightnessLevel);
  const darkItems = brightnesses.filter(b => b === 'dark').length;
  const brightItems = brightnesses.filter(b => b === 'bright' || b === 'light').length;
  if (darkItems > 0 && brightItems > 0) score += 5;
  if (darkItems === brightnesses.length && brightnesses.length >= 3) score -= 10;

  return Math.max(0, Math.min(100, score));
}

export function computePatternBalance(items: Record<string, Product>): number {
  const all = Object.values(items).filter(Boolean);
  if (all.length < 3) return 50;

  const patterns = all.map(i => i.pattern || '').filter(Boolean);
  if (patterns.length < Math.ceil(all.length * 0.4)) return 50;

  const nonSolid = patterns.filter(p => p !== 'solid');

  if (nonSolid.length === 0) return 92;
  if (nonSolid.length === 1) return 95;

  const PATTERN_COMPAT: Record<string, Record<string, number>> = {
    solid:   { solid: 85, stripe: 90, check: 88, graphic: 80, print: 78, floral: 82, other: 75 },
    stripe:  { solid: 90, stripe: 30, check: 25, graphic: 35, print: 40, floral: 35, other: 45 },
    check:   { solid: 88, stripe: 25, check: 25, graphic: 35, print: 38, floral: 30, other: 40 },
    graphic: { solid: 80, stripe: 35, check: 35, graphic: 30, print: 35, floral: 30, other: 40 },
    print:   { solid: 78, stripe: 40, check: 38, graphic: 35, print: 28, floral: 30, other: 40 },
    floral:  { solid: 82, stripe: 35, check: 30, graphic: 30, print: 30, floral: 25, other: 35 },
    other:   { solid: 75, stripe: 45, check: 40, graphic: 40, print: 40, floral: 35, other: 50 },
  };

  let totalCompat = 0;
  let pairCount = 0;
  for (let i = 0; i < nonSolid.length; i++) {
    for (let j = i + 1; j < nonSolid.length; j++) {
      const p1 = nonSolid[i].toLowerCase();
      const p2 = nonSolid[j].toLowerCase();
      totalCompat += PATTERN_COMPAT[p1]?.[p2] ?? PATTERN_COMPAT[p2]?.[p1] ?? 50;
      pairCount++;
    }
  }

  let score = pairCount > 0 ? totalCompat / pairCount : 70;
  if (nonSolid.length > 2) score -= 15;
  if (nonSolid.length >= 3) score -= 10;

  return Math.max(0, Math.min(100, score));
}
