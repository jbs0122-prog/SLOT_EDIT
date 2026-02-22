import { Product } from '../data/outfits';
import { scoreOutfit } from './matchingScoring';
import {
  inferColorFamily,
  getColorHarmonyScore,
  isNeutralColor,
  getVibeCompatScore,
  getBodyTypeSilhouetteScore,
  SEASON_WARMTH_TARGETS,
} from './matchingData';

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
    imageFeature: number;
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
    if (product.season.includes(filters.targetSeason)) score += 25;
    else score -= 20;
  }

  if (filters.targetSeason && product.warmth !== undefined) {
    const bounds = SEASON_WARMTH_TARGETS[filters.targetSeason];
    if (bounds) {
      if (product.warmth >= bounds.min && product.warmth <= bounds.max) score += 20;
      else if (product.warmth < bounds.min - 1 || product.warmth > bounds.max + 1) score -= 25;
      else score -= 10;
    }
  }

  if (filters.targetWarmth !== undefined && product.warmth !== undefined) {
    const diff = Math.abs(product.warmth - filters.targetWarmth);
    if (diff <= 0.5) score += 20;
    else if (diff <= 1) score += 10;
    else if (diff > 2) score -= 25;
    else if (diff > 1.5) score -= 15;
  }

  if (filters.bodyType && product.category && product.silhouette) {
    const fitScore = getBodyTypeSilhouetteScore(filters.bodyType, product.category, product.silhouette);
    score += fitScore;

    if (product.category === 'bottom' && product.silhouette === 'wide') {
      score += 12;
    }
  }

  const usage = usageCounts[product.id] ?? 0;
  if (usage === 0) score += 25;
  else if (usage === 1) score += 10;
  else if (usage === 2) score -= 5;
  else if (usage === 3) score -= 20;
  else score -= 40;

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

  const nonBlackBuckets = [...colorFamilyBuckets.entries()].filter(([k]) => k !== 'black' && k !== 'unknown');
  const blackBucket = colorFamilyBuckets.get('black') || [];

  const result: Product[] = [];

  const maxBlack = Math.max(1, Math.floor(maxPerSlot * 0.25));
  result.push(...blackBucket.slice(0, maxBlack));

  const remaining = maxPerSlot - result.length;
  if (nonBlackBuckets.length > 0) {
    const perBucket = Math.max(1, Math.ceil(remaining / nonBlackBuckets.length));
    for (const [, bucket] of nonBlackBuckets) {
      const take = Math.min(perBucket, bucket.length);
      for (const p of bucket.slice(0, take)) {
        if (result.length >= maxPerSlot) break;
        if (!result.find(r => r.id === p.id)) result.push(p);
      }
      if (result.length >= maxPerSlot) break;
    }
  }

  if (result.length < maxPerSlot) {
    for (const { product } of scored) {
      if (result.length >= maxPerSlot) break;
      if (!result.find(r => r.id === product.id)) result.push(product);
    }
  }

  return result.slice(0, maxPerSlot);
}

function passesHardConstraints(
  outfit: OutfitCandidate,
  context?: { targetSeason?: string; targetWarmth?: number }
): boolean {
  const allItems = [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory, outfit.accessory_2]
    .filter(Boolean) as Product[];

  const formalities = allItems.map(i => i.formality).filter((f): f is number => typeof f === 'number');
  if (formalities.length >= 2) {
    const range = Math.max(...formalities) - Math.min(...formalities);
    if (range > 3) return false;
  }

  const warmths = allItems.map(i => i.warmth).filter((w): w is number => typeof w === 'number');
  const avgWarmth = warmths.length > 0 ? warmths.reduce((s, w) => s + w, 0) / warmths.length : undefined;

  if (context?.targetSeason && avgWarmth !== undefined) {
    const bounds = SEASON_WARMTH_TARGETS[context.targetSeason];
    if (bounds) {
      if (avgWarmth < bounds.min - 0.8 || avgWarmth > bounds.max + 0.8) return false;
    }
  }

  if (context?.targetWarmth !== undefined && avgWarmth !== undefined) {
    if (Math.abs(avgWarmth - context.targetWarmth) > 2.5) return false;
  }

  if (context?.targetSeason) {
    const coreItems = [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes].filter(Boolean) as Product[];
    let mismatchCount = 0;
    for (const item of coreItems) {
      const seasons = item.season || [];
      if (seasons.length > 0 && !seasons.includes(context.targetSeason)) {
        mismatchCount++;
      }
    }
    if (mismatchCount > Math.ceil(coreItems.length * 0.5)) return false;
  }

  const colors = allItems.map(p => inferColorFamily(p)).filter(Boolean);
  const uniqueColors = new Set(colors);
  if (uniqueColors.size === 1 && isNeutralColor(colors[0]) && colors.length >= 4) {
    return false;
  }
  const blackCount = colors.filter(c => c === 'black').length;
  if (blackCount >= 4 && colors.length >= 5) return false;

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

function countOutfitBlacks(outfit: OutfitCandidate): number {
  return [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes]
    .filter(Boolean)
    .map(p => inferColorFamily(p as Product))
    .filter(c => c === 'black')
    .length;
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

      if (filters.targetSeason && p.season && p.season.length > 0) {
        if (!p.season.includes(filters.targetSeason)) {
          const adjacentSeasons: Record<string, string[]> = {
            spring: ['fall'], summer: ['spring'], fall: ['spring', 'winter'], winter: ['fall'],
          };
          const adjacent = adjacentSeasons[filters.targetSeason] || [];
          if (!p.season.some(s => adjacent.includes(s))) return false;
        }
      }

      return true;
    });

  const anchorSlot = anchor?.slotType;
  const needsOuter = anchorSlot === 'outer' || shouldIncludeOuter(filters.targetSeason, filters.targetWarmth);
  const needsMid = anchorSlot === 'mid' || shouldIncludeMid(filters.targetSeason, filters.targetWarmth);

  const MAX_PER_CORE_SLOT = 10;
  const MAX_PER_OPT_SLOT = 6;

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

  const combinations: OutfitCandidate[] = [];
  const MAX_COMBINATIONS = 5000;
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
            const coreOutfit: OutfitCandidate = { top, bottom, shoes: shoe };
            if (outer) coreOutfit.outer = outer;
            if (mid) coreOutfit.mid = mid;

            if (!passesHardConstraints(coreOutfit, {
              targetSeason: filters.targetSeason,
              targetWarmth: filters.targetWarmth,
            })) continue;

            const usedIds = new Set([top.id, bottom.id, shoe.id, outer?.id, mid?.id].filter(Boolean));
            const coreHash = [top.id, bottom.id, shoe.id, outer?.id || '', mid?.id || ''].join('');
            const hashNum = coreHash.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);

            let bag: Product | undefined;
            if (bags.length > 0) {
              const startIdx = Math.abs(hashNum) % bags.length;
              for (let bi = 0; bi < bags.length; bi++) {
                const candidate = bags[(startIdx + bi) % bags.length];
                if (!usedIds.has(candidate.id)) { bag = candidate; break; }
              }
              if (!bag) bag = bags[startIdx % bags.length];
            }

            let acc: Product | undefined;
            if (accessories.length > 0) {
              const startIdx = Math.abs(hashNum * 31) % accessories.length;
              for (let ai = 0; ai < accessories.length; ai++) {
                const candidate = accessories[(startIdx + ai) % accessories.length];
                if (!usedIds.has(candidate.id) && candidate.id !== bag?.id) { acc = candidate; break; }
              }
              if (!acc) acc = accessories[startIdx % accessories.length];
            }

            if (bag) { coreOutfit.bag = bag; usedIds.add(bag.id); }
            if (acc) coreOutfit.accessory = acc;

            combinations.push(coreOutfit);
            count++;

            if (combinations.length >= MAX_COMBINATIONS) break;
            if (count % 1000 === 0) await yieldToMain();
          }
          if (combinations.length >= MAX_COMBINATIONS) break;
        }
        if (combinations.length >= MAX_COMBINATIONS) break;
      }
      if (combinations.length >= MAX_COMBINATIONS) break;
    }
    if (combinations.length >= MAX_COMBINATIONS) break;
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
  const maxOuterRepeat = Math.max(2, Math.ceil(topN / 4));
  const maxPaletteRepeat = Math.max(1, Math.ceil(topN / 4));
  const maxProductRepeat = 1;
  const anchorProductId = anchor?.product.id ?? null;

  const getAllIds = (outfit: OutfitCandidate): string[] =>
    [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory, outfit.accessory_2]
      .filter((p): p is Product => !!p)
      .map(p => p.id);

  const hasZeroUsageItem = (outfit: OutfitCandidate): boolean => {
    return getAllIds(outfit).some(id => id !== anchorProductId && (usageCounts[id] ?? 0) === 0);
  };

  const hasColorDiversity = (outfit: OutfitCandidate): boolean => {
    const colors = [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes]
      .filter(Boolean)
      .map(p => inferColorFamily(p as Product))
      .filter(Boolean);
    const unique = new Set(colors);
    return unique.size >= 2;
  };

  const trySelect = (enforceProductLimit: boolean, requireZeroUsage: boolean, requireColorDiversity: boolean) => {
    for (const candidate of pool) {
      if (selected.length >= topN) break;
      if (selected.includes(candidate)) continue;
      if (requireZeroUsage && !hasZeroUsageItem(candidate.outfit)) continue;
      if (requireColorDiversity && !hasColorDiversity(candidate.outfit)) continue;

      const outerId = candidate.outfit.outer?.id || 'none';
      if (outerId !== 'none' && outerId !== anchorProductId) {
        if ((outerCounts.get(outerId) || 0) >= maxOuterRepeat) continue;
      }

      const paletteKey = getOutfitColorKey(candidate.outfit);
      if (!anchor && (paletteCounts.get(paletteKey) || 0) >= maxPaletteRepeat) continue;

      if (enforceProductLimit) {
        const allIds = getAllIds(candidate.outfit);
        if (allIds.some(id => id !== anchorProductId && (productCounts.get(id) || 0) >= maxProductRepeat)) continue;
      }

      selected.push(candidate);
      outerCounts.set(outerId, (outerCounts.get(outerId) || 0) + 1);
      paletteCounts.set(paletteKey, (paletteCounts.get(paletteKey) || 0) + 1);
      for (const id of getAllIds(candidate.outfit)) {
        if (id !== anchorProductId) productCounts.set(id, (productCounts.get(id) || 0) + 1);
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

const USAGE_PENALTY_SCALE = 12;
const MAX_USAGE_PENALTY = 60;

function computeUsagePenalty(outfit: OutfitCandidate, usageCounts: Record<string, number>): number {
  const items = [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory, outfit.accessory_2]
    .filter((p): p is Product => !!p);
  const usages = items.map(p => usageCounts[p.id] ?? 0);
  const maxUsage = Math.max(...usages);
  const avgUsage = usages.reduce((s, u) => s + u, 0) / usages.length;
  return Math.min(MAX_USAGE_PENALTY, (maxUsage * 0.7 + avgUsage * 0.3) * USAGE_PENALTY_SCALE);
}

function computeColorDiversityBonus(outfit: OutfitCandidate): number {
  const blacks = countOutfitBlacks(outfit);
  const colors = [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes]
    .filter(Boolean)
    .map(p => inferColorFamily(p as Product))
    .filter(Boolean);
  const unique = new Set(colors);

  let bonus = 0;
  if (blacks >= 3) bonus -= 15;
  if (blacks >= 4) bonus -= 20;

  if (unique.size >= 3) bonus += 10;
  if (!colors.every(c => isNeutralColor(c)) && unique.size >= 2) bonus += 5;

  return bonus;
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

  const CHUNK = 500;
  const scoredOutfits: Array<{ outfit: OutfitCandidate; matchScore: MatchScore }> = [];
  for (let i = 0; i < combinations.length; i += CHUNK) {
    const chunk = combinations.slice(i, i + CHUNK);
    for (const outfit of chunk) {
      scoredOutfits.push({
        outfit,
        matchScore: scoreOutfit(outfit, {
          targetWarmth: filters.targetWarmth,
          targetSeason: filters.targetSeason,
          bodyType: filters.bodyType,
        }),
      });
    }
    if (i % 2000 === 0) await yieldToMain();
  }

  const hasAnyZeroUsage = combinations.some(outfit => {
    const items = [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory, outfit.accessory_2]
      .filter((p): p is Product => !!p);
    return items.some(p => (usageCounts[p.id] ?? 0) === 0);
  });

  scoredOutfits.sort((a, b) => {
    const aPenalty = computeUsagePenalty(a.outfit, usageCounts);
    const bPenalty = computeUsagePenalty(b.outfit, usageCounts);
    const aColorBonus = computeColorDiversityBonus(a.outfit);
    const bColorBonus = computeColorDiversityBonus(b.outfit);
    const aHasZero = hasAnyZeroUsage &&
      [a.outfit.outer, a.outfit.mid, a.outfit.top, a.outfit.bottom, a.outfit.shoes, a.outfit.bag, a.outfit.accessory, a.outfit.accessory_2]
        .filter((p): p is Product => !!p)
        .some(p => (usageCounts[p.id] ?? 0) === 0);
    const bHasZero = hasAnyZeroUsage &&
      [b.outfit.outer, b.outfit.mid, b.outfit.top, b.outfit.bottom, b.outfit.shoes, b.outfit.bag, b.outfit.accessory, b.outfit.accessory_2]
        .filter((p): p is Product => !!p)
        .some(p => (usageCounts[p.id] ?? 0) === 0);

    if (aHasZero !== bHasZero) return aHasZero ? -1 : 1;
    return (b.matchScore.score - bPenalty + bColorBonus) - (a.matchScore.score - aPenalty + aColorBonus);
  });

  return selectDiverse(scoredOutfits, topN, anchor, usageCounts);
}
