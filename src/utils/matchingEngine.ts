import { Product } from '../data/outfits';
import { assembleOutfits, OutfitResult } from './matching/beamSearch';
import { scoreComposition } from './matching/scorer';
import { selectDiverseOutfits, computeUsagePenalty, computeColorDiversityBonus } from './matching/diversityFilter';

export interface MatchScore {
  score: number;
  breakdown: {
    colorMatch: number;
    toneMatch: number;
    patternBalance: number;
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

const DEDUP_STRICT_SLOTS: Array<keyof OutfitCandidate> = ['outer', 'mid'];

function greedySlotDedup(
  primary: Array<{ outfit: OutfitCandidate; matchScore: MatchScore; result: OutfitResult }>,
  topN: number,
  fallback: Array<{ outfit: OutfitCandidate; matchScore: MatchScore; result: OutfitResult }>
): Array<{ outfit: OutfitCandidate; matchScore: MatchScore; result: OutfitResult }> {
  const result: Array<{ outfit: OutfitCandidate; matchScore: MatchScore; result: OutfitResult }> = [];
  const usedSlotProducts = new Map<string, Set<string>>();
  const addedResultIds = new Set<string>();

  for (const slot of DEDUP_STRICT_SLOTS) {
    usedSlotProducts.set(slot, new Set<string>());
  }

  const ALL_SLOTS: Array<keyof OutfitCandidate> = ['outer', 'mid', 'top', 'bottom', 'shoes'];
  const getResultKey = (candidate: { outfit: OutfitCandidate }): string =>
    ALL_SLOTS
      .map(slot => (candidate.outfit[slot] as Product | undefined)?.id ?? 'none')
      .join('|');

  const countConflicts = (candidate: { outfit: OutfitCandidate }): number => {
    let conflicts = 0;
    for (const slot of DEDUP_STRICT_SLOTS) {
      const product = candidate.outfit[slot] as Product | undefined;
      if (product && usedSlotProducts.get(slot)!.has(product.id)) {
        conflicts++;
      }
    }
    return conflicts;
  };

  const commit = (candidate: { outfit: OutfitCandidate; matchScore: MatchScore; result: OutfitResult }): void => {
    result.push(candidate);
    addedResultIds.add(getResultKey(candidate));
    for (const slot of DEDUP_STRICT_SLOTS) {
      const product = candidate.outfit[slot] as Product | undefined;
      if (product) usedSlotProducts.get(slot)!.add(product.id);
    }
  };

  for (const candidate of primary) {
    if (result.length >= topN) break;
    if (countConflicts(candidate) === 0) commit(candidate);
  }

  if (result.length < topN) {
    for (const candidate of primary) {
      if (result.length >= topN) break;
      const key = getResultKey(candidate);
      if (addedResultIds.has(key)) continue;
      if (countConflicts(candidate) <= 1) commit(candidate);
    }
  }

  if (result.length < topN) {
    for (const candidate of fallback) {
      if (result.length >= topN) break;
      const key = getResultKey(candidate);
      if (addedResultIds.has(key)) continue;
      commit(candidate);
    }
  }

  return result;
}

function resultToCandidate(result: OutfitResult): OutfitCandidate {
  const items = result.items;
  return {
    outer: items.outer,
    mid: items.mid,
    top: items.top!,
    bottom: items.bottom!,
    shoes: items.shoes!,
    bag: items.bag,
    accessory: items.accessory,
    accessory_2: items.accessory_2,
  };
}

function candidateToItems(outfit: OutfitCandidate): Record<string, Product> {
  const items: Record<string, Product> = {};
  if (outfit.outer) items.outer = outfit.outer;
  if (outfit.mid) items.mid = outfit.mid;
  if (outfit.top) items.top = outfit.top;
  if (outfit.bottom) items.bottom = outfit.bottom;
  if (outfit.shoes) items.shoes = outfit.shoes;
  if (outfit.bag) items.bag = outfit.bag;
  if (outfit.accessory) items.accessory = outfit.accessory;
  if (outfit.accessory_2) items.accessory_2 = outfit.accessory_2;
  return items;
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
  const context = {
    gender: filters.gender,
    bodyType: filters.bodyType,
    vibe: filters.vibe,
    targetSeason: filters.targetSeason,
    targetWarmth: filters.targetWarmth,
  };

  const anchorParam = anchor
    ? { product: anchor.product, slotType: anchor.slotType as string as import('./matching/types').SlotName }
    : undefined;

  const results = await assembleOutfits(products, context, anchorParam, usageCounts);

  const scored = results.map(result => {
    const outfit = resultToCandidate(result);
    const items = candidateToItems(outfit);
    const composition = scoreComposition(items, context);

    const matchScore: MatchScore = {
      score: composition.total,
      breakdown: {
        colorMatch: composition.breakdown.tonalHarmony,
        toneMatch: composition.breakdown.tonalHarmony,
        patternBalance: composition.breakdown.contextFit,
        warmthMatch: composition.breakdown.contextFit,
        seasonMatch: composition.breakdown.contextFit,
        silhouetteBalance: composition.breakdown.proportion,
        materialCompat: composition.breakdown.materialCompat,
        subCategoryMatch: composition.breakdown.formalityCoherence,
        colorDepth: composition.breakdown.colorDepth,
        moodCoherence: composition.breakdown.vibeAffinity,
        accessoryHarmony: composition.breakdown.contextFit,
        imageFeature: composition.breakdown.contextFit,
      },
    };

    return { outfit, matchScore, result };
  });

  const hasAnyZeroUsage = scored.some(({ outfit }) => {
    const items = [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory, outfit.accessory_2]
      .filter((p): p is Product => !!p);
    return items.some(p => (usageCounts[p.id] ?? 0) === 0);
  });

  scored.sort((a, b) => {
    const aPenalty = computeUsagePenalty(candidateToItems(a.outfit), usageCounts);
    const bPenalty = computeUsagePenalty(candidateToItems(b.outfit), usageCounts);
    const aBonus = computeColorDiversityBonus(candidateToItems(a.outfit));
    const bBonus = computeColorDiversityBonus(candidateToItems(b.outfit));

    const aHasZero = hasAnyZeroUsage && [a.outfit.outer, a.outfit.mid, a.outfit.top, a.outfit.bottom, a.outfit.shoes, a.outfit.bag, a.outfit.accessory, a.outfit.accessory_2]
      .filter((p): p is Product => !!p).some(p => (usageCounts[p.id] ?? 0) === 0);
    const bHasZero = hasAnyZeroUsage && [b.outfit.outer, b.outfit.mid, b.outfit.top, b.outfit.bottom, b.outfit.shoes, b.outfit.bag, b.outfit.accessory, b.outfit.accessory_2]
      .filter((p): p is Product => !!p).some(p => (usageCounts[p.id] ?? 0) === 0);

    if (aHasZero !== bHasZero) return aHasZero ? -1 : 1;
    return (b.matchScore.score - bPenalty + bBonus) - (a.matchScore.score - aPenalty + aBonus);
  });

  const diverseScored = selectDiverseOutfits(
    scored.map(s => ({ result: s.result, finalScore: s.matchScore.score })),
    topN,
    usageCounts,
    anchor?.product.id
  );

  const diverseMap = new Set(diverseScored.map(d => d.result));
  const diverseResults = scored.filter(s => diverseMap.has(s.result));

  if (diverseResults.length < topN) {
    for (const s of scored) {
      if (diverseResults.length >= topN) break;
      if (!diverseResults.includes(s)) diverseResults.push(s);
    }
  }

  const finalResults = greedySlotDedup(diverseResults, topN, scored);

  return finalResults.slice(0, topN).map(({ outfit, matchScore }) => ({ outfit, matchScore }));
}
