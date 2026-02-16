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
  anchor?: AnchorItem
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

  return generateSampled(outers, mids, tops, bottoms, shoes, bags, accessories, filters, anchor);
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
  anchor?: AnchorItem
): OutfitCandidate[] {
  const MAX_SAMPLES = 10000;
  const seen = new Set<string>();
  const combinations: OutfitCandidate[] = [];
  const anchorSlot = anchor?.slotType;
  const anchorProduct = anchor?.product;

  for (let i = 0; i < MAX_SAMPLES; i++) {
    const top = anchorSlot === 'top' ? anchorProduct! : pickRandom(tops);
    const bottom = anchorSlot === 'bottom' ? anchorProduct! : pickRandom(bottoms);
    const shoe = anchorSlot === 'shoes' ? anchorProduct! : pickRandom(shoes);

    let outer: Product | undefined;
    if (anchorSlot === 'outer') {
      outer = anchorProduct!;
    } else {
      outer = outers.length > 0 ? pickRandom(outers) : undefined;
    }

    let mid: Product | undefined;
    if (anchorSlot === 'mid') {
      mid = anchorProduct!;
    } else {
      mid = mids.length > 0 ? (Math.random() < 0.85 ? pickRandom(mids) : undefined) : undefined;
    }

    let bag: Product | undefined;
    if (anchorSlot === 'bag') {
      bag = anchorProduct!;
    } else {
      bag = bags.length > 0 ? (Math.random() < 0.8 ? pickRandom(bags) : undefined) : undefined;
    }

    let accessory: Product | undefined;
    if (anchorSlot === 'accessory') {
      accessory = anchorProduct!;
    } else {
      accessory = accessories.length > 0 ? (Math.random() < 0.7 ? pickRandom(accessories) : undefined) : undefined;
    }

    let accessory2: Product | undefined;
    if (anchorSlot === 'accessory_2') {
      accessory2 = anchorProduct!;
      if (!accessory && accessories.length > 0) {
        accessory = pickRandom(accessories.filter(a => a.id !== anchorProduct!.id));
      }
    } else if (accessory && accessories.length > 1 && Math.random() < 0.4) {
      const remaining = accessories.filter(a => a.id !== accessory!.id);
      if (remaining.length > 0) accessory2 = pickRandom(remaining);
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
  anchor?: AnchorItem
): Array<{ outfit: OutfitCandidate; matchScore: MatchScore }> {
  if (scored.length <= topN) return scored;

  const pool = scored.slice(0, Math.min(scored.length, topN * 20));
  const selected: Array<{ outfit: OutfitCandidate; matchScore: MatchScore }> = [];
  const outerCounts = new Map<string, number>();
  const paletteCounts = new Map<string, number>();
  const maxOuterRepeat = Math.max(2, Math.ceil(topN / 3));
  const maxPaletteRepeat = Math.max(2, Math.ceil(topN / 3));
  const anchorOuterId = anchor?.slotType === 'outer' ? anchor.product.id : null;

  for (const candidate of pool) {
    if (selected.length >= topN) break;

    const outerId = candidate.outfit.outer?.id || 'none';
    if (outerId !== anchorOuterId) {
      const currentOuterCount = outerCounts.get(outerId) || 0;
      if (currentOuterCount >= maxOuterRepeat) continue;
    }

    const paletteKey = getOutfitColorKey(candidate.outfit);
    const currentPaletteCount = paletteCounts.get(paletteKey) || 0;
    if (!anchor && currentPaletteCount >= maxPaletteRepeat) continue;

    selected.push(candidate);
    outerCounts.set(outerId, (outerCounts.get(outerId) || 0) + 1);
    paletteCounts.set(paletteKey, currentPaletteCount + 1);
  }

  if (selected.length < topN) {
    for (const candidate of pool) {
      if (selected.length >= topN) break;
      if (!selected.includes(candidate)) {
        selected.push(candidate);
      }
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
  anchor?: AnchorItem
): Array<{ outfit: OutfitCandidate; matchScore: MatchScore }> {
  const combinations = generateOutfitCombinations(products, filters, anchor);

  const scoredOutfits = combinations.map(outfit => ({
    outfit,
    matchScore: scoreOutfit(outfit, {
      targetWarmth: filters.targetWarmth,
      targetSeason: filters.targetSeason,
    }),
  }));

  scoredOutfits.sort((a, b) => b.matchScore.score - a.matchScore.score);

  return selectDiverse(scoredOutfits, topN, anchor);
}
