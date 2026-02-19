import { Product } from '../data/outfits';
import { scoreOutfit } from './matchingScoring';

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

function weightedPickRandom<T extends { id: string }>(arr: T[], usageCounts: Record<string, number>): T {
  const weights = arr.map(item => {
    const usage = usageCounts[item.id] ?? 0;
    if (usage === 0) return 3.0;
    if (usage === 1) return 2.0;
    if (usage <= 3) return 1.0;
    return 0.5;
  });
  const total = weights.reduce((sum, w) => sum + w, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getColorFamily(item: Product): string {
  return item.color_family || '';
}

function getFormality(item: Product): number | undefined {
  return item.formality;
}

function getWarmth(item: Product): number | undefined {
  return item.warmth;
}

function passesHardConstraints(
  outfit: OutfitCandidate,
  context?: { targetSeason?: string }
): boolean {
  const coreItems = [outfit.top, outfit.bottom, outfit.shoes].filter(Boolean);
  if (coreItems.length < 3) return false;

  const allItems = [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory, outfit.accessory_2]
    .filter(Boolean) as Product[];
  const formalities = allItems.map(getFormality).filter((f): f is number => typeof f === 'number');

  if (formalities.length >= 2) {
    const range = Math.max(...formalities) - Math.min(...formalities);
    if (range > 3) return false;
  }

  if (context?.targetSeason === 'summer') {
    const warmths = allItems.map(getWarmth).filter((w): w is number => typeof w === 'number');
    if (warmths.length > 0) {
      const avgWarmth = warmths.reduce((s, w) => s + w, 0) / warmths.length;
      if (avgWarmth > 4) return false;
    }
  }

  if (context?.targetSeason === 'winter') {
    const warmths = allItems.map(getWarmth).filter((w): w is number => typeof w === 'number');
    if (warmths.length > 0) {
      const avgWarmth = warmths.reduce((s, w) => s + w, 0) / warmths.length;
      if (avgWarmth < 1.5) return false;
    }
  }

  return true;
}

function shouldIncludeOuter(targetSeason?: string, targetWarmth?: number): boolean {
  if (targetWarmth !== undefined && targetWarmth <= 2) return false;
  return true;
}

function shouldIncludeMid(targetWarmth?: number): boolean {
  if (targetWarmth !== undefined && targetWarmth <= 3) return false;
  return true;
}

function getOutfitColorKey(outfit: OutfitCandidate): string {
  return [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes, outfit.accessory]
    .filter(Boolean)
    .map(item => getColorFamily(item as Product))
    .filter(Boolean)
    .sort()
    .join('-');
}

export interface AnchorItem {
  product: Product;
  slotType: keyof OutfitCandidate;
}

export function generateOutfitCombinations(
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
): OutfitCandidate[] {
  const filterProducts = (category: string) => {
    return products.filter(p => {
      if (p.category !== category) return false;
      if (p.stock_status && p.stock_status !== 'in_stock') return false;
      if (filters.gender && p.gender !== 'UNISEX' && p.gender !== filters.gender) return false;
      if (filters.bodyType && p.body_type && p.body_type.length > 0 && !p.body_type.includes(filters.bodyType.toLowerCase())) return false;
      if (filters.vibe && p.vibe && p.vibe.length > 0 && !p.vibe.includes(filters.vibe)) return false;
      return true;
    });
  };

  const anchorSlot = anchor?.slotType;
  const needsOuter = anchorSlot === 'outer' || shouldIncludeOuter(filters.targetSeason, filters.targetWarmth);
  const needsMid = anchorSlot === 'mid' || shouldIncludeMid(filters.targetWarmth);

  const outers = needsOuter ? filterProducts('outer') : [];
  const mids = needsMid ? filterProducts('mid') : [];
  const tops = filterProducts('top');
  const bottoms = filterProducts('bottom');
  const shoes = filterProducts('shoes');
  const bags = filterProducts('bag');
  const accessories = filterProducts('accessory');

  if (anchor) {
    const ensureInList = (list: Product[], product: Product) => {
      if (!list.find(p => p.id === product.id)) {
        list.push(product);
      }
    };
    const catMap: Record<string, Product[]> = { outer: outers, mid: mids, top: tops, bottom: bottoms, shoes, bag: bags, accessory: accessories };
    const targetList = catMap[anchor.product.category];
    if (targetList) ensureInList(targetList, anchor.product);
  }

  if (tops.length === 0 || bottoms.length === 0 || shoes.length === 0) {
    return [];
  }

  return generateSampled(outers, mids, tops, bottoms, shoes, bags, accessories, filters, anchor, usageCounts);
}

function generateSampled(
  outers: Product[],
  mids: Product[],
  tops: Product[],
  bottoms: Product[],
  shoes: Product[],
  bags: Product[],
  accessories: Product[],
  filters: { targetSeason?: string },
  anchor?: AnchorItem,
  usageCounts: Record<string, number> = {}
): OutfitCandidate[] {
  const MAX_SAMPLES = 15000;
  const seen = new Set<string>();
  const combinations: OutfitCandidate[] = [];
  const anchorSlot = anchor?.slotType;
  const anchorProduct = anchor?.product;

  const zeroUsageTops = anchorSlot === 'top' ? [] : tops.filter(p => (usageCounts[p.id] ?? 0) === 0);
  const zeroUsageBottoms = anchorSlot === 'bottom' ? [] : bottoms.filter(p => (usageCounts[p.id] ?? 0) === 0);
  const zeroUsageShoes = anchorSlot === 'shoes' ? [] : shoes.filter(p => (usageCounts[p.id] ?? 0) === 0);
  const zeroUsageOuters = anchorSlot === 'outer' ? [] : outers.filter(p => (usageCounts[p.id] ?? 0) === 0);
  const zeroUsageBags = anchorSlot === 'bag' ? [] : bags.filter(p => (usageCounts[p.id] ?? 0) === 0);
  const zeroUsageAccessories = anchorSlot === 'accessory' ? [] : accessories.filter(p => (usageCounts[p.id] ?? 0) === 0);

  const pickForSlot = (
    zeroPool: Product[],
    allPool: Product[],
    forceZeroProb: number
  ): Product => {
    if (zeroPool.length > 0 && Math.random() < forceZeroProb) {
      return pickRandom(zeroPool);
    }
    return weightedPickRandom(allPool, usageCounts);
  };

  for (let i = 0; i < MAX_SAMPLES; i++) {
    const forceZeroProb = i < MAX_SAMPLES * 0.6 ? 0.7 : 0.3;

    const top = anchorSlot === 'top' ? anchorProduct! : pickForSlot(zeroUsageTops, tops, forceZeroProb);
    const bottom = anchorSlot === 'bottom' ? anchorProduct! : pickForSlot(zeroUsageBottoms, bottoms, forceZeroProb);
    const shoe = anchorSlot === 'shoes' ? anchorProduct! : pickForSlot(zeroUsageShoes, shoes, forceZeroProb);

    let outer: Product | undefined;
    if (anchorSlot === 'outer') {
      outer = anchorProduct!;
    } else {
      outer = outers.length > 0 ? pickForSlot(zeroUsageOuters, outers, forceZeroProb) : undefined;
    }

    let mid: Product | undefined;
    if (anchorSlot === 'mid') {
      mid = anchorProduct!;
    } else {
      mid = mids.length > 0 ? (Math.random() < 0.85 ? weightedPickRandom(mids, usageCounts) : undefined) : undefined;
    }

    let bag: Product | undefined;
    if (anchorSlot === 'bag') {
      bag = anchorProduct!;
    } else {
      bag = bags.length > 0 ? (Math.random() < 0.8 ? pickForSlot(zeroUsageBags, bags, forceZeroProb) : undefined) : undefined;
    }

    let accessory: Product | undefined;
    if (anchorSlot === 'accessory') {
      accessory = anchorProduct!;
    } else {
      accessory = accessories.length > 0 ? (Math.random() < 0.7 ? pickForSlot(zeroUsageAccessories, accessories, forceZeroProb) : undefined) : undefined;
    }

    let accessory2: Product | undefined;
    if (anchorSlot === 'accessory_2') {
      accessory2 = anchorProduct!;
      if (!accessory && accessories.length > 0) {
        const remaining = accessories.filter(a => a.id !== anchorProduct!.id);
        if (remaining.length > 0) accessory = weightedPickRandom(remaining, usageCounts);
      }
    } else if (accessory && accessories.length > 1 && Math.random() < 0.4) {
      const remaining = accessories.filter(a => a.id !== accessory!.id);
      if (remaining.length > 0) accessory2 = weightedPickRandom(remaining, usageCounts);
    }

    const key = [
      outer?.id || '', mid?.id || '', top.id, bottom.id, shoe.id,
      bag?.id || '', accessory?.id || '', accessory2?.id || '',
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);

    const outfit: OutfitCandidate = { top, bottom, shoes: shoe };
    if (outer) outfit.outer = outer;
    if (mid) outfit.mid = mid;
    if (bag) outfit.bag = bag;
    if (accessory) outfit.accessory = accessory;
    if (accessory2) outfit.accessory_2 = accessory2;

    if (passesHardConstraints(outfit, { targetSeason: filters.targetSeason })) {
      combinations.push(outfit);
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

  const pool = scored.slice(0, Math.min(scored.length, topN * 50));
  const selected: Array<{ outfit: OutfitCandidate; matchScore: MatchScore }> = [];
  const outerCounts = new Map<string, number>();
  const paletteCounts = new Map<string, number>();
  const productCounts = new Map<string, number>();
  const maxOuterRepeat = Math.max(2, Math.ceil(topN / 3));
  const maxPaletteRepeat = Math.max(2, Math.ceil(topN / 3));
  const maxProductRepeat = 1;
  const anchorOuterId = anchor?.slotType === 'outer' ? anchor.product.id : null;
  const anchorProductId = anchor?.product.id ?? null;

  const getCoreIds = (outfit: OutfitCandidate): string[] => [
    outfit.top.id,
    outfit.bottom.id,
    outfit.shoes.id,
  ];

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
        const currentOuterCount = outerCounts.get(outerId) || 0;
        if (currentOuterCount >= maxOuterRepeat) continue;
      }

      const paletteKey = getOutfitColorKey(candidate.outfit);
      const currentPaletteCount = paletteCounts.get(paletteKey) || 0;
      if (!anchor && currentPaletteCount >= maxPaletteRepeat) continue;

      if (enforceProductLimit) {
        const coreIds = getCoreIds(candidate.outfit);
        const blocked = coreIds.some(id => {
          if (id === anchorProductId) return false;
          return (productCounts.get(id) || 0) >= maxProductRepeat;
        });
        if (blocked) continue;
      }

      selected.push(candidate);
      outerCounts.set(outerId, (outerCounts.get(outerId) || 0) + 1);
      paletteCounts.set(paletteKey, currentPaletteCount + 1);

      for (const id of [...getCoreIds(candidate.outfit), ...getOptionalIds(candidate.outfit)]) {
        if (id !== anchorProductId) {
          productCounts.set(id, (productCounts.get(id) || 0) + 1);
        }
      }
    }
  };

  trySelect(true, true);

  if (selected.length < topN) {
    trySelect(true, false);
  }

  if (selected.length < topN) {
    trySelect(false, false);
  }

  if (selected.length < topN) {
    const relaxedMax = 2;
    for (const candidate of pool) {
      if (selected.length >= topN) break;
      if (selected.includes(candidate)) continue;
      const coreIds = getCoreIds(candidate.outfit);
      const blocked = coreIds.some(id => {
        if (id === anchorProductId) return false;
        return (productCounts.get(id) || 0) >= relaxedMax;
      });
      if (!blocked) {
        selected.push(candidate);
        for (const id of [...getCoreIds(candidate.outfit), ...getOptionalIds(candidate.outfit)]) {
          if (id !== anchorProductId) productCounts.set(id, (productCounts.get(id) || 0) + 1);
        }
      }
    }
  }

  if (selected.length < topN) {
    for (const candidate of pool) {
      if (selected.length >= topN) break;
      if (!selected.includes(candidate)) selected.push(candidate);
    }
  }

  return selected;
}

export function findBestOutfits(
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
): Array<{ outfit: OutfitCandidate; matchScore: MatchScore }> {
  const combinations = generateOutfitCombinations(products, filters, anchor, usageCounts);

  const scoredOutfits = combinations.map(outfit => ({
    outfit,
    matchScore: scoreOutfit(outfit, {
      targetWarmth: filters.targetWarmth,
      targetSeason: filters.targetSeason,
    }),
  }));

  const getOutfitMinUsage = (outfit: OutfitCandidate): number => {
    const items = [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory, outfit.accessory_2]
      .filter((p): p is Product => !!p);
    return Math.min(...items.map(p => usageCounts[p.id] ?? 0));
  };

  scoredOutfits.sort((a, b) => {
    const aMinUsage = getOutfitMinUsage(a.outfit);
    const bMinUsage = getOutfitMinUsage(b.outfit);
    if (aMinUsage !== bMinUsage) return aMinUsage - bMinUsage;
    return b.matchScore.score - a.matchScore.score;
  });

  return selectDiverse(scoredOutfits, topN, anchor, usageCounts);
}
