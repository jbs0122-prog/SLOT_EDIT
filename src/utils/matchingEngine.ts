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
  top: Product;
  bottom: Product;
  shoes: Product;
  bag?: Product;
  accessory?: Product;
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

  const allItems = [outfit.outer, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory]
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
      if (avgWarmth < 2) return false;
    }
  }

  return true;
}

function shouldIncludeOuter(targetSeason?: string, targetWarmth?: number): boolean {
  if (targetSeason === 'summer') return false;
  if (targetWarmth !== undefined && targetWarmth <= 2) return false;
  return true;
}

function getOutfitColorKey(outfit: OutfitCandidate): string {
  return [outfit.outer, outfit.top, outfit.bottom, outfit.shoes]
    .filter(Boolean)
    .map(item => getColorFamily(item as Product))
    .filter(Boolean)
    .sort()
    .join('-');
}

export function generateOutfitCombinations(
  products: Product[],
  filters: {
    gender?: string;
    bodyType?: string;
    vibe?: string;
    targetWarmth?: number;
    targetSeason?: string;
  }
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

  const needsOuter = shouldIncludeOuter(filters.targetSeason, filters.targetWarmth);

  const outers = needsOuter ? filterProducts('outer') : [];
  const tops = filterProducts('top');
  const bottoms = filterProducts('bottom');
  const shoes = filterProducts('shoes');
  const bags = filterProducts('bag');
  const accessories = filterProducts('accessory');

  if (tops.length === 0 || bottoms.length === 0 || shoes.length === 0) {
    return [];
  }

  const totalBrute = (outers.length || 1) * tops.length * bottoms.length * shoes.length * (bags.length || 1) * (accessories.length || 1);

  if (totalBrute <= 2000) {
    return generateBruteForce(outers, tops, bottoms, shoes, bags, accessories, filters);
  }

  return generateSampled(outers, tops, bottoms, shoes, bags, accessories, filters);
}

function generateBruteForce(
  outers: Product[],
  tops: Product[],
  bottoms: Product[],
  shoes: Product[],
  bags: Product[],
  accessories: Product[],
  filters: { targetSeason?: string }
): OutfitCandidate[] {
  const combinations: OutfitCandidate[] = [];

  const outerList = shuffle(outers.length > 0 ? outers : [undefined as unknown as Product]);
  const topList = shuffle(tops);
  const bottomList = shuffle(bottoms);
  const shoeList = shuffle(shoes);
  const bagList = shuffle(bags.length > 0 ? bags : [undefined as unknown as Product]);
  const accList = shuffle(accessories.length > 0 ? accessories : [undefined as unknown as Product]);

  for (const outer of outerList) {
    for (const top of topList) {
      for (const bottom of bottomList) {
        for (const shoe of shoeList) {
          for (const bag of bagList) {
            for (const accessory of accList) {
              const outfit: OutfitCandidate = { top, bottom, shoes: shoe };
              if (outer) outfit.outer = outer;
              if (bag) outfit.bag = bag;
              if (accessory) outfit.accessory = accessory;

              if (passesHardConstraints(outfit, { targetSeason: filters.targetSeason })) {
                combinations.push(outfit);
              }
            }
          }
        }
      }
    }
  }

  return combinations;
}

function generateSampled(
  outers: Product[],
  tops: Product[],
  bottoms: Product[],
  shoes: Product[],
  bags: Product[],
  accessories: Product[],
  filters: { targetSeason?: string }
): OutfitCandidate[] {
  const MAX_SAMPLES = 10000;
  const seen = new Set<string>();
  const combinations: OutfitCandidate[] = [];

  for (let i = 0; i < MAX_SAMPLES; i++) {
    const top = pickRandom(tops);
    const bottom = pickRandom(bottoms);
    const shoe = pickRandom(shoes);
    const outer = outers.length > 0 ? pickRandom(outers) : undefined;
    const bag = bags.length > 0 ? (Math.random() < 0.8 ? pickRandom(bags) : undefined) : undefined;
    const accessory = accessories.length > 0 ? (Math.random() < 0.7 ? pickRandom(accessories) : undefined) : undefined;

    const key = [outer?.id || '', top.id, bottom.id, shoe.id, bag?.id || '', accessory?.id || ''].join('|');
    if (seen.has(key)) continue;
    seen.add(key);

    const outfit: OutfitCandidate = { top, bottom, shoes: shoe };
    if (outer) outfit.outer = outer;
    if (bag) outfit.bag = bag;
    if (accessory) outfit.accessory = accessory;

    if (passesHardConstraints(outfit, { targetSeason: filters.targetSeason })) {
      combinations.push(outfit);
    }
  }

  return combinations;
}

function selectDiverse(
  scored: Array<{ outfit: OutfitCandidate; matchScore: MatchScore }>,
  topN: number
): Array<{ outfit: OutfitCandidate; matchScore: MatchScore }> {
  if (scored.length <= topN) return scored;

  const pool = scored.slice(0, Math.min(scored.length, topN * 20));
  const selected: Array<{ outfit: OutfitCandidate; matchScore: MatchScore }> = [];
  const outerCounts = new Map<string, number>();
  const paletteCounts = new Map<string, number>();
  const maxOuterRepeat = Math.max(2, Math.ceil(topN / 3));
  const maxPaletteRepeat = Math.max(2, Math.ceil(topN / 3));

  for (const candidate of pool) {
    if (selected.length >= topN) break;

    const outerId = candidate.outfit.outer?.id || 'none';
    const currentOuterCount = outerCounts.get(outerId) || 0;
    if (currentOuterCount >= maxOuterRepeat) continue;

    const paletteKey = getOutfitColorKey(candidate.outfit);
    const currentPaletteCount = paletteCounts.get(paletteKey) || 0;
    if (currentPaletteCount >= maxPaletteRepeat) continue;

    selected.push(candidate);
    outerCounts.set(outerId, currentOuterCount + 1);
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
  topN: number = 10
): Array<{ outfit: OutfitCandidate; matchScore: MatchScore }> {
  const combinations = generateOutfitCombinations(products, filters);

  const scoredOutfits = combinations.map(outfit => ({
    outfit,
    matchScore: scoreOutfit(outfit, {
      targetWarmth: filters.targetWarmth,
      targetSeason: filters.targetSeason,
    }),
  }));

  scoredOutfits.sort((a, b) => b.matchScore.score - a.matchScore.score);

  return selectDiverse(scoredOutfits, topN);
}
