import { Product } from '../../data/outfits';
import { resolveColorFamily, isNeutralColor } from './colorDna';
import { OutfitResult } from './beamSearch';

interface ScoredOutfit {
  result: OutfitResult;
  finalScore: number;
}

function getOutfitColorKey(items: Record<string, Product>): string {
  return Object.values(items)
    .filter(Boolean)
    .map(p => resolveColorFamily(p.color || '', p.color_family) || '')
    .filter(Boolean)
    .sort()
    .join('-');
}

function getAllProductIds(items: Record<string, Product>): string[] {
  return Object.values(items).filter(Boolean).map(p => p.id);
}

function hasColorDiversity(items: Record<string, Product>): boolean {
  const colors = ['outer', 'mid', 'top', 'bottom', 'shoes']
    .map(k => items[k])
    .filter(Boolean)
    .map(p => resolveColorFamily(p!.color || '', p!.color_family))
    .filter(Boolean);
  return new Set(colors).size >= 2;
}

function hasZeroUsageItem(
  items: Record<string, Product>,
  usageCounts: Record<string, number>,
  anchorId?: string
): boolean {
  return getAllProductIds(items).some(id => id !== anchorId && (usageCounts[id] ?? 0) === 0);
}

export function selectDiverseOutfits(
  scored: ScoredOutfit[],
  topN: number,
  usageCounts: Record<string, number> = {},
  anchorId?: string
): ScoredOutfit[] {
  if (scored.length <= topN) return scored;

  const pool = scored.slice(0, Math.min(scored.length, topN * 60));
  const selected: ScoredOutfit[] = [];
  const outerCounts = new Map<string, number>();
  const paletteCounts = new Map<string, number>();
  const productCounts = new Map<string, number>();
  const maxOuterRepeat = Math.max(3, Math.ceil(topN / 3));
  const maxPaletteRepeat = Math.max(2, Math.ceil(topN / 3));
  const maxProductRepeat = 2;

  const trySelect = (
    enforceProductLimit: boolean,
    requireZeroUsage: boolean,
    requireColorDiversity: boolean
  ) => {
    for (const candidate of pool) {
      if (selected.length >= topN) break;
      if (selected.includes(candidate)) continue;

      const items = candidate.result.items;
      if (requireZeroUsage && !hasZeroUsageItem(items, usageCounts, anchorId)) continue;
      if (requireColorDiversity && !hasColorDiversity(items)) continue;

      const outerId = items.outer?.id || 'none';
      if (outerId !== 'none' && outerId !== anchorId) {
        if ((outerCounts.get(outerId) || 0) >= maxOuterRepeat) continue;
      }

      const paletteKey = getOutfitColorKey(items);
      if (!anchorId && (paletteCounts.get(paletteKey) || 0) >= maxPaletteRepeat) continue;

      if (enforceProductLimit) {
        const allIds = getAllProductIds(items);
        if (allIds.some(id => id !== anchorId && (productCounts.get(id) || 0) >= maxProductRepeat)) continue;
      }

      selected.push(candidate);
      outerCounts.set(outerId, (outerCounts.get(outerId) || 0) + 1);
      paletteCounts.set(paletteKey, (paletteCounts.get(paletteKey) || 0) + 1);
      for (const id of getAllProductIds(items)) {
        if (id !== anchorId) productCounts.set(id, (productCounts.get(id) || 0) + 1);
      }
    }
  };

  trySelect(true, true, true);
  if (selected.length < topN) trySelect(true, true, false);
  if (selected.length < topN) trySelect(true, false, true);
  if (selected.length < topN) trySelect(true, false, false);
  if (selected.length < topN) trySelect(false, false, false);

  if (selected.length < topN) {
    for (const candidate of pool) {
      if (selected.length >= topN) break;
      if (!selected.includes(candidate)) selected.push(candidate);
    }
  }

  return selected;
}

export function computeUsagePenalty(
  items: Record<string, Product>,
  usageCounts: Record<string, number>
): number {
  const all = Object.values(items).filter(Boolean);
  const usages = all.map(p => usageCounts[p.id] ?? 0);
  if (usages.length === 0) return 0;

  const maxUsage = Math.max(...usages);
  const avgUsage = usages.reduce((s, u) => s + u, 0) / usages.length;
  return Math.min(60, (maxUsage * 0.7 + avgUsage * 0.3) * 12);
}

export function computeColorDiversityBonus(items: Record<string, Product>): number {
  const coreColors = ['outer', 'mid', 'top', 'bottom', 'shoes']
    .map(k => items[k])
    .filter(Boolean)
    .map(p => resolveColorFamily(p!.color || '', p!.color_family))
    .filter(Boolean);

  const unique = new Set(coreColors);
  const blackCount = coreColors.filter(c => c === 'black').length;

  let bonus = 0;
  if (blackCount >= 3) bonus -= 15;
  if (blackCount >= 4) bonus -= 20;
  if (unique.size >= 3) bonus += 10;
  if (!coreColors.every(c => isNeutralColor(c)) && unique.size >= 2) bonus += 5;

  return bonus;
}
