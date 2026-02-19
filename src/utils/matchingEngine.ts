import { Product } from '../data/outfits';
import { scoreOutfit } from './matchingScoring';
import { inferColorFamily, getColorHarmonyScore, isNeutralColor, getVibeCompatScore } from './matchingData';

export interface MatchScore {
  score: number;
  breakdown: {
    colorMatch: number;
    toneMatch: number;
    patternBalance: number;
    formalityMatch: number;
    warmthMatch: number;
    seasonMatch: number;
    silhouetteBalance: number;
    materialCompat: number;
    subCategoryMatch: number;
    colorDepth: number;
    moodCoherence: number;
    accessoryHarmony: number;
  };
}

export interface OutfitCandidate {
  outer?: Product;
  mid?: Product;
  top: Product;
  bottom: Product;
  shoes: Product;
  bag?: Product;
  accessory?: Product;
  accessory_2?: Product;
}

export { scoreOutfit } from './matchingScoring';

export interface AnchorItem {
  product: Product;
  slotType: keyof OutfitCandidate;
}

function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function scoreProductForContext(
  product: Product,
  filters: { gender?: string; bodyType?: string; vibe?: string; targetSeason?: string; targetWarmth?: number },
  usageCounts: Record<string, number>
): number {
  let score = 100;

  if (filters.vibe && product.vibe && product.vibe.length > 0) {
    const vibeScore = Math.max(...product.vibe.map(v => getVibeCompatScore(v, filters.vibe!)));
    score += (vibeScore - 50) * 0.6;
  }

  if (filters.targetSeason && product.season && product.season.length > 0) {
    if (product.season.includes(filters.targetSeason)) score += 15;
    else score -= 10;
  }

  if (filters.targetWarmth !== undefined && product.warmth !== undefined) {
    const diff = Math.abs(product.warmth - filters.targetWarmth);
    if (diff <= 0.5) score += 15;
    else if (diff <= 1) score += 5;
    else if (diff > 2) score -= 20;
  }

  const usage = usageCounts[product.id] ?? 0;
  if (usage === 0) score += 20;
  else if (usage === 1) score += 10;
  else if (usage <= 3) score += 0;
  else score -= 15;

  return score;
}

function pickTopCandidatesPerSlot(
  products: Product[],
  maxPerSlot: number,
  filters: { gender?: string; bodyType?: string; vibe?: string; targetSeason?: string; targetWarmth?: number },
  usageCounts: Record<string, number>
): Product[] {
  if (products.length <= maxPerSlot) return products;

  const scored = products.map(p => ({
    product: p,
    score: scoreProductForContext(p, filters, usageCounts),
  }));

  scored.sort((a, b) => b.score - a.score);

  const colorFamilyBuckets = new Map<string, Product[]>();
  for (const { product } of scored) {
    const cf = inferColorFamily(product) || 'unknown';
    if (!colorFamilyBuckets.has(cf)) colorFamilyBuckets.set(cf, []);
    colorFamilyBuckets.get(cf)!.push(product);
  }

  const result: Product[] = [];
  const perBucketTarget = Math.ceil(maxPerSlot / colorFamilyBuckets.size);
  const buckets = [...colorFamilyBuckets.values()];

  for (const bucket of buckets) {
    const take = Math.min(perBucketTarget, bucket.length);
    result.push(...bucket.slice(0, take));
    if (result.length >= maxPerSlot) break;
  }

  if (result.length < maxPerSlot) {
    for (const { product } of scored) {
      if (result.length >= maxPerSlot) break;
      if (!result.includes(product)) result.push(product);
    }
  }

  return result.slice(0, maxPerSlot);
}

function passesHardConstraints(
  outfit: OutfitCandidate,
  context?: { targetSeason?: string }
): boolean {
  const allItems = [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory, outfit.accessory_2]
    .filter(Boolean) as Product[];

  const formalities = allItems.map(i => i.formality).filter((f): f is number => typeof f === 'number');
  if (formalities.length >= 2) {
    const range = Math.max(...formalities) - Math.min(...formalities);
    if (range > 3) return false;
  }

  if (context?.targetSeason === 'summer') {
    const warmths = allItems.map(i => i.warmth).filter((w): w is number => typeof w === 'number');
    if (warmths.length > 0 && warmths.reduce((s, w) => s + w, 0) / warmths.length > 4) return false;
  }

  if (context?.targetSeason === 'winter') {
    const warmths = allItems.map(i => i.warmth).filter((w): w is number => typeof w === 'number');
    if (warmths.length > 0 && warmths.reduce((s, w) => s + w, 0) / warmths.length < 1.5) return false;
  }

  return true;
}

function shouldIncludeOuter(targetSeason?: string, targetWarmth?: number): boolean {
  if (targetSeason === 'summer') return false;
  if (targetWarmth !== undefined && targetWarmth <= 2) return false;
  return true;
}

function shouldIncludeMid(targetSeason?: string, targetWarmth?: number): boolean {
  if (targetSeason === 'summer') return false;
  if (targetWarmth !== undefined && targetWarmth <= 3) return false;
  return true;
}

function getOutfitColorKey(outfit: OutfitCandidate): string {
  return [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes, outfit.accessory]
    .filter(Boolean)
    .map(item => inferColorFamily(item as Product) || '')
    .filter(Boolean)
    .sort()
    .join('-');
}

export async function generateOutfitCombinations(
  products: Product[],
  filters: {
    gender?: string;
    bodyType?: string;
    vibe?: string;
    targetWarmth?: number;
    targetSeason?: string;
  },
  anchor?: AnchorItem,
  usageCounts: Record<string, number> = {}
): Promise<OutfitCandidate[]> {
  const filterProducts = (category: string) =>
    products.filter(p => {
      if (p.category !== category) return false;
      if (p.stock_status && p.stock_status !== 'in_stock') return false;
      if (filters.gender && p.gender !== 'UNISEX' && p.gender !== filters.gender) return false;
      if (filters.bodyType && p.body_type && p.body_type.length > 0 && !p.body_type.includes(filters.bodyType.toLowerCase())) return false;
      if (filters.vibe && p.vibe && p.vibe.length > 0 && !p.vibe.includes(filters.vibe)) return false;
      return true;
    });

  const anchorSlot = anchor?.slotType;
  const needsOuter = anchorSlot === 'outer' || shouldIncludeOuter(filters.targetSeason, filters.targetWarmth);
  const needsMid = anchorSlot === 'mid' || shouldIncludeMid(filters.targetSeason, filters.targetWarmth);

  const MAX_PER_CORE_SLOT = 12;
  const MAX_PER_OPT_SLOT = 8;

  const rawTops = filterProducts('top');
  const rawBottoms = filterProducts('bottom');
  const rawShoes = filterProducts('shoes');
  const rawOuters = needsOuter ? filterProducts('outer') : [];
  const rawMids = needsMid ? filterProducts('mid') : [];
  const rawBags = filterProducts('bag');
  const rawAccessories = filterProducts('accessory');

  if (anchor) {
    const ensureInList = (list: Product[], product: Product) => {
      if (!list.find(p => p.id === product.id)) list.push(product);
    };
    const catMap: Record<string, Product[]> = {
      outer: rawOuters, mid: rawMids, top: rawTops,
      bottom: rawBottoms, shoes: rawShoes, bag: rawBags, accessory: rawAccessories,
    };
    if (catMap[anchor.product.category]) ensureInList(catMap[anchor.product.category], anchor.product);
  }

  if (rawTops.length === 0 || rawBottoms.length === 0 || rawShoes.length === 0) return [];

  const tops = anchorSlot === 'top' ? [anchor!.product] : pickTopCandidatesPerSlot(rawTops, MAX_PER_CORE_SLOT, filters, usageCounts);
  const bottoms = anchorSlot === 'bottom' ? [anchor!.product] : pickTopCandidatesPerSlot(rawBottoms, MAX_PER_CORE_SLOT, filters, usageCounts);
  const shoes = anchorSlot === 'shoes' ? [anchor!.product] : pickTopCandidatesPerSlot(rawShoes, MAX_PER_CORE_SLOT, filters, usageCounts);
  const outers = anchorSlot === 'outer' ? [anchor!.product] : pickTopCandidatesPerSlot(rawOuters, MAX_PER_OPT_SLOT, filters, usageCounts);
  const mids = anchorSlot === 'mid' ? [anchor!.product] : pickTopCandidatesPerSlot(rawMids, MAX_PER_OPT_SLOT, filters, usageCounts);
  const bags = anchorSlot === 'bag' ? [anchor!.product] : pickTopCandidatesPerSlot(rawBags, MAX_PER_OPT_SLOT, filters, usageCounts);
  const accessories = anchorSlot === 'accessory' ? [anchor!.product] : pickTopCandidatesPerSlot(rawAccessories, MAX_PER_OPT_SLOT, filters, usageCounts);

  const outerPool = outers.length > 0 ? [undefined, ...outers] : [undefined];
  const midPool = mids.length > 0 ? [undefined, ...mids] : [undefined];
  const bagPool = bags.length > 0 ? [undefined, ...bags] : [undefined];
  const accPool = accessories.length > 0 ? [undefined, ...accessories] : [undefined];

  const combinations: OutfitCandidate[] = [];
  let count = 0;

  for (const top of (anchorSlot === 'top' ? [anchor!.product] : tops)) {
    const topColorFamily = inferColorFamily(top) || '';
    for (const bottom of (anchorSlot === 'bottom' ? [anchor!.product] : bottoms)) {
      const bottomColorFamily = inferColorFamily(bottom) || '';
      const topBottomHarmony = topColorFamily && bottomColorFamily
        ? getColorHarmonyScore(topColorFamily, bottomColorFamily)
        : 60;
      if (topBottomHarmony < 30) continue;

      for (const shoe of (anchorSlot === 'shoes' ? [anchor!.product] : shoes)) {
        const shoeColorFamily = inferColorFamily(shoe) || '';
        const shoeHarmony = shoeColorFamily && topColorFamily
          ? getColorHarmonyScore(shoeColorFamily, topColorFamily)
          : 60;
        if (shoeHarmony < 25) continue;

        for (const outer of (anchorSlot === 'outer' ? [anchor!.product] : outerPool)) {
          if (outer) {
            const outerCF = inferColorFamily(outer) || '';
            const outerHarmony = outerCF && topColorFamily
              ? getColorHarmonyScore(outerCF, topColorFamily)
              : 60;
            if (outerHarmony < 25) continue;
          }

          for (const mid of (anchorSlot === 'mid' ? [anchor!.product] : midPool)) {
            for (const bag of (anchorSlot === 'bag' ? [anchor!.product] : bagPool)) {
              for (const acc of (anchorSlot === 'accessory' ? [anchor!.product] : accPool)) {
                const outfit: OutfitCandidate = { top, bottom, shoes: shoe };
                if (outer) outfit.outer = outer;
                if (mid) outfit.mid = mid;
                if (bag) outfit.bag = bag;
                if (acc) outfit.accessory = acc;

                if (passesHardConstraints(outfit, { targetSeason: filters.targetSeason })) {
                  combinations.push(outfit);
                }

                count++;
                if (count % 2000 === 0) await yieldToMain();
              }
            }
          }
        }
      }
    }
  }

  return combinations;
}

function selectDiverse(
  scored: Array<{ outfit: OutfitCandidate; matchScore: MatchScore }>,
  topN: number,
  anchor?: AnchorItem,
  usageCounts: Record<string, number> = {}
): Array<{ outfit: OutfitCandidate; matchScore: MatchScore }> {
  if (scored.length <= topN) return scored;

  const pool = scored.slice(0, Math.min(scored.length, topN * 30));
  const selected: Array<{ outfit: OutfitCandidate; matchScore: MatchScore }> = [];
  const outerCounts = new Map<string, number>();
  const paletteCounts = new Map<string, number>();
  const productCounts = new Map<string, number>();
  const maxOuterRepeat = Math.max(2, Math.ceil(topN / 3));
  const maxPaletteRepeat = Math.max(2, Math.ceil(topN / 3));
  const maxProductRepeat = 1;
  const anchorOuterId = anchor?.slotType === 'outer' ? anchor.product.id : null;
  const anchorProductId = anchor?.product.id ?? null;

  const getCoreIds = (outfit: OutfitCandidate): string[] => [outfit.top.id, outfit.bottom.id, outfit.shoes.id];
  const getOptionalIds = (outfit: OutfitCandidate): string[] =>
    [outfit.outer, outfit.mid, outfit.bag, outfit.accessory, outfit.accessory_2]
      .filter((p): p is Product => !!p)
      .map(p => p.id);

  const hasZeroUsageItem = (outfit: OutfitCandidate): boolean => {
    const allIds = [...getCoreIds(outfit), ...getOptionalIds(outfit)];
    return allIds.some(id => id !== anchorProductId && (usageCounts[id] ?? 0) === 0);
  };

  const trySelect = (enforceProductLimit: boolean, requireZeroUsage: boolean) => {
    for (const candidate of pool) {
      if (selected.length >= topN) break;
      if (selected.includes(candidate)) continue;
      if (requireZeroUsage && !hasZeroUsageItem(candidate.outfit)) continue;

      const outerId = candidate.outfit.outer?.id || 'none';
      if (outerId !== anchorOuterId) {
        if ((outerCounts.get(outerId) || 0) >= maxOuterRepeat) continue;
      }

      const paletteKey = getOutfitColorKey(candidate.outfit);
      if (!anchor && (paletteCounts.get(paletteKey) || 0) >= maxPaletteRepeat) continue;

      if (enforceProductLimit) {
        const coreIds = getCoreIds(candidate.outfit);
        if (coreIds.some(id => id !== anchorProductId && (productCounts.get(id) || 0) >= maxProductRepeat)) continue;
      }

      selected.push(candidate);
      outerCounts.set(outerId, (outerCounts.get(outerId) || 0) + 1);
      paletteCounts.set(paletteKey, (paletteCounts.get(paletteKey) || 0) + 1);
      for (const id of [...getCoreIds(candidate.outfit), ...getOptionalIds(candidate.outfit)]) {
        if (id !== anchorProductId) productCounts.set(id, (productCounts.get(id) || 0) + 1);
      }
    }
  };

  trySelect(true, true);
  if (selected.length < topN) trySelect(true, false);
  if (selected.length < topN) trySelect(false, false);

  if (selected.length < topN) {
    for (const candidate of pool) {
      if (selected.length >= topN) break;
      if (!selected.includes(candidate)) selected.push(candidate);
    }
  }

  return selected;
}

const USAGE_PENALTY_SCALE = 8;

function computeUsagePenalty(outfit: OutfitCandidate, usageCounts: Record<string, number>): number {
  const items = [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory, outfit.accessory_2]
    .filter((p): p is Product => !!p);
  const usages = items.map(p => usageCounts[p.id] ?? 0);
  const maxUsage = Math.max(...usages);
  const avgUsage = usages.reduce((s, u) => s + u, 0) / usages.length;
  return Math.min(40, (maxUsage * 0.6 + avgUsage * 0.4) * USAGE_PENALTY_SCALE);
}

export async function findBestOutfits(
  products: Product[],
  filters: {
    gender?: string;
    bodyType?: string;
    vibe?: string;
    targetWarmth?: number;
    targetSeason?: string;
  },
  topN: number = 10,
  anchor?: AnchorItem,
  usageCounts: Record<string, number> = {}
): Promise<Array<{ outfit: OutfitCandidate; matchScore: MatchScore }>> {
  const combinations = await generateOutfitCombinations(products, filters, anchor, usageCounts);

  await yieldToMain();

  const CHUNK = 300;
  const scoredOutfits: Array<{ outfit: OutfitCandidate; matchScore: MatchScore }> = [];
  for (let i = 0; i < combinations.length; i += CHUNK) {
    const chunk = combinations.slice(i, i + CHUNK);
    for (const outfit of chunk) {
      scoredOutfits.push({
        outfit,
        matchScore: scoreOutfit(outfit, {
          targetWarmth: filters.targetWarmth,
          targetSeason: filters.targetSeason,
        }),
      });
    }
    await yieldToMain();
  }

  const hasAnyZeroUsage = combinations.some(outfit => {
    const items = [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory, outfit.accessory_2]
      .filter((p): p is Product => !!p);
    return items.some(p => (usageCounts[p.id] ?? 0) === 0);
  });

  scoredOutfits.sort((a, b) => {
    const aPenalty = computeUsagePenalty(a.outfit, usageCounts);
    const bPenalty = computeUsagePenalty(b.outfit, usageCounts);
    const aHasZero = hasAnyZeroUsage &&
      [a.outfit.outer, a.outfit.mid, a.outfit.top, a.outfit.bottom, a.outfit.shoes, a.outfit.bag, a.outfit.accessory, a.outfit.accessory_2]
        .filter((p): p is Product => !!p)
        .some(p => (usageCounts[p.id] ?? 0) === 0);
    const bHasZero = hasAnyZeroUsage &&
      [b.outfit.outer, b.outfit.mid, b.outfit.top, b.outfit.bottom, b.outfit.shoes, b.outfit.bag, b.outfit.accessory, b.outfit.accessory_2]
        .filter((p): p is Product => !!p)
        .some(p => (usageCounts[p.id] ?? 0) === 0);

    if (aHasZero !== bHasZero) return aHasZero ? -1 : 1;
    return (b.matchScore.score - bPenalty) - (a.matchScore.score - aPenalty);
  });

  return selectDiverse(scoredOutfits, topN, anchor, usageCounts);
}
