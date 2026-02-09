import { Product } from '../data/outfits';

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

const NEUTRAL_COLORS = ['black', 'white', 'grey', 'beige', 'navy'];
const EARTH_TONES = ['beige', 'brown', 'green', 'orange'];

const COLOR_HARMONY_RULES: { [key: string]: string[] } = {
  black: ['white', 'grey', 'beige', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'orange'],
  white: ['black', 'grey', 'navy', 'blue', 'red', 'green', 'beige', 'brown'],
  grey: ['black', 'white', 'navy', 'blue', 'pink', 'yellow', 'beige'],
  navy: ['white', 'beige', 'grey', 'brown', 'red', 'yellow'],
  beige: ['white', 'brown', 'navy', 'black', 'green', 'blue'],
  brown: ['beige', 'white', 'green', 'orange', 'yellow', 'navy'],
  blue: ['white', 'grey', 'beige', 'yellow', 'orange', 'brown', 'black'],
  green: ['beige', 'brown', 'white', 'black', 'yellow', 'blue'],
  red: ['black', 'white', 'navy', 'grey', 'beige'],
  yellow: ['navy', 'grey', 'black', 'blue', 'white', 'brown'],
  purple: ['grey', 'white', 'black', 'beige', 'pink'],
  pink: ['grey', 'white', 'black', 'navy', 'beige'],
  orange: ['navy', 'brown', 'beige', 'grey', 'black', 'white'],
  metallic: ['black', 'white', 'navy', 'grey', 'beige'],
  multi: ['black', 'white', 'grey', 'navy', 'beige'],
};

const SILHOUETTE_BALANCE: { [key: string]: string[] } = {
  oversized: ['slim', 'fitted', 'straight', 'tapered'],
  relaxed: ['slim', 'fitted', 'straight', 'tapered'],
  wide: ['fitted', 'slim'],
  fitted: ['wide', 'relaxed', 'oversized', 'straight'],
  slim: ['wide', 'relaxed', 'oversized', 'regular'],
  regular: ['slim', 'fitted', 'wide', 'relaxed', 'oversized'],
  straight: ['fitted', 'slim', 'oversized', 'relaxed'],
  tapered: ['relaxed', 'oversized', 'regular', 'wide'],
};

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

function getColorTone(item: Product): string {
  return item.color_tone || '';
}

function getPattern(item: Product): string {
  return item.pattern || '';
}

function getFormality(item: Product): number | undefined {
  return item.formality;
}

function getWarmth(item: Product): number | undefined {
  return item.warmth;
}

function getSilhouette(item: Product): string {
  return item.silhouette || '';
}

export function scoreColorMatch(outfit: OutfitCandidate): number {
  const items = [outfit.outer, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory].filter(Boolean) as Product[];
  if (items.length < 3) return 0;

  let score = 100;
  const colorFamilies = items.map(getColorFamily).filter(Boolean);

  if (colorFamilies.length === 0) return 50;
  if (colorFamilies.length < Math.ceil(items.length * 0.5)) return 50;

  const neutralCount = colorFamilies.filter(c => NEUTRAL_COLORS.includes(c)).length;
  const accentColors = colorFamilies.filter(c => !NEUTRAL_COLORS.includes(c));
  const uniqueAccents = new Set(accentColors);

  if (uniqueAccents.size > 2) {
    score -= 30;
  } else if (uniqueAccents.size === 2) {
    score -= 10;
  }

  if (neutralCount >= colorFamilies.length - 1 && uniqueAccents.size <= 1) {
    score += 15;
  }

  const earthToneCount = colorFamilies.filter(c => EARTH_TONES.includes(c)).length;
  if (earthToneCount >= 2 && neutralCount >= 1) {
    score += 8;
  }

  for (let i = 0; i < colorFamilies.length; i++) {
    for (let j = i + 1; j < colorFamilies.length; j++) {
      const color1 = colorFamilies[i];
      const color2 = colorFamilies[j];

      if (color1 === color2) {
        if (NEUTRAL_COLORS.includes(color1)) {
          score += 3;
        } else {
          score -= 8;
        }
        continue;
      }

      const harmonizes = COLOR_HARMONY_RULES[color1]?.includes(color2);
      if (!harmonizes) {
        score -= 15;
      } else {
        score += 3;
      }
    }
  }

  return Math.max(0, Math.min(100, score));
}

export function scoreToneMatch(outfit: OutfitCandidate): number {
  const items = [outfit.outer, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory].filter(Boolean) as Product[];
  if (items.length < 3) return 0;

  let score = 100;
  const tones = items.map(getColorTone).filter(Boolean);

  if (tones.length === 0) return 50;
  if (tones.length < Math.ceil(items.length * 0.5)) return 50;

  const toneSet = new Set(tones);
  const neutralCount = tones.filter(t => t === 'neutral').length;
  const warmCount = tones.filter(t => t === 'warm').length;
  const coolCount = tones.filter(t => t === 'cool').length;

  if (warmCount > 0 && coolCount > 0) {
    const mixRatio = Math.min(warmCount, coolCount) / Math.max(warmCount, coolCount);
    if (mixRatio > 0.5 && neutralCount === 0) {
      score -= 25;
    } else if (mixRatio > 0.3) {
      score -= 12;
    }
  }

  if (toneSet.size === 1) {
    score += 20;
  } else if (toneSet.size === 2 && neutralCount > 0) {
    score += 12;
  }

  return Math.max(0, Math.min(100, score));
}

export function scorePatternBalance(outfit: OutfitCandidate): number {
  const items = [outfit.outer, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory].filter(Boolean) as Product[];
  if (items.length < 3) return 0;

  let score = 100;
  const patterns = items.map(getPattern).filter(Boolean);

  if (patterns.length === 0) return 50;
  if (patterns.length < Math.ceil(items.length * 0.5)) return 50;

  const solidCount = patterns.filter(p => p === 'solid').length;
  const patternedCount = patterns.length - solidCount;

  if (patternedCount === 0) {
    score += 10;
  } else if (patternedCount === 1) {
    score += 15;
  } else if (patternedCount === 2) {
    const nonSolidPatterns = patterns.filter(p => p !== 'solid');
    const uniquePatterns = new Set(nonSolidPatterns);
    if (uniquePatterns.size === 1) {
      score -= 10;
    } else {
      score += 3;
    }
  } else if (patternedCount >= 3) {
    score -= 30;
  }

  const visiblePatterns = [
    outfit.outer ? getPattern(outfit.outer) : null,
    getPattern(outfit.top),
    getPattern(outfit.bottom),
  ].filter(Boolean).filter(p => p !== 'solid');

  if (visiblePatterns.length > 2) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}

export function scoreFormalityMatch(outfit: OutfitCandidate): number {
  const items = [outfit.outer, outfit.top, outfit.bottom, outfit.shoes].filter(Boolean) as Product[];
  if (items.length < 3) return 0;

  let score = 100;
  const formalities = items.map(getFormality).filter((f): f is number => typeof f === 'number');

  if (formalities.length === 0) return 50;
  if (formalities.length < Math.ceil(items.length * 0.5)) return 50;

  const avg = formalities.reduce((sum, f) => sum + f, 0) / formalities.length;

  for (const formality of formalities) {
    const deviation = Math.abs(formality - avg);
    if (deviation > 2) {
      score -= 20;
    } else if (deviation > 1) {
      score -= 10;
    }
  }

  const avgDeviation = formalities.reduce((sum, f) => sum + Math.abs(f - avg), 0) / formalities.length;
  if (avgDeviation < 0.5) {
    score += 15;
  }

  const range = Math.max(...formalities) - Math.min(...formalities);
  if (range > 2) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

export function scoreWarmthMatch(outfit: OutfitCandidate, targetWarmth?: number): number {
  const items = [outfit.outer, outfit.top, outfit.bottom, outfit.shoes].filter(Boolean) as Product[];
  if (items.length < 3) return 0;

  let score = 100;
  const warmths = items.map(getWarmth).filter((w): w is number => typeof w === 'number');

  if (warmths.length === 0) return 50;
  if (warmths.length < Math.ceil(items.length * 0.5)) return 50;

  const avg = warmths.reduce((sum, w) => sum + w, 0) / warmths.length;

  if (targetWarmth) {
    const targetDeviation = Math.abs(avg - targetWarmth);
    if (targetDeviation > 1.5) {
      score -= 30;
    } else if (targetDeviation > 1) {
      score -= 15;
    } else {
      score += 10;
    }
  }

  const range = Math.max(...warmths) - Math.min(...warmths);
  if (range > 2) {
    score -= 20;
  } else if (range <= 1) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

export function scoreSeasonMatch(outfit: OutfitCandidate, targetSeason?: string): number {
  const items = [outfit.outer, outfit.top, outfit.bottom, outfit.shoes].filter(Boolean) as Product[];
  if (items.length < 3) return 0;
  if (!targetSeason) return 75;

  let score = 100;
  let matchCount = 0;

  for (const item of items) {
    const seasons = item.season || [];
    if (seasons.includes(targetSeason)) {
      matchCount++;
      score += 5;
    } else if (seasons.length === 0) {
      score -= 5;
    } else {
      score -= 10;
    }
  }

  if (matchCount === items.length) {
    score += 15;
  }

  return Math.max(0, Math.min(100, score));
}

export function scoreSilhouetteBalance(outfit: OutfitCandidate): number {
  const topSil = getSilhouette(outfit.top);
  const bottomSil = getSilhouette(outfit.bottom);

  if (!topSil || !bottomSil) return 50;

  let score = 70;

  const goodPairs = SILHOUETTE_BALANCE[topSil];
  if (goodPairs && goodPairs.includes(bottomSil)) {
    score += 30;
  } else if (topSil === bottomSil) {
    if (topSil === 'oversized' || topSil === 'wide') {
      score -= 20;
    } else if (topSil === 'fitted' || topSil === 'slim') {
      score -= 5;
    }
  }

  if (outfit.outer) {
    const outerSil = getSilhouette(outfit.outer);
    if (outerSil === 'oversized' && topSil === 'oversized') {
      score -= 15;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function passesHardConstraints(
  outfit: OutfitCandidate,
  context?: { targetSeason?: string }
): boolean {
  const coreItems = [outfit.top, outfit.bottom, outfit.shoes].filter(Boolean);
  if (coreItems.length < 3) return false;

  const allItems = [outfit.outer, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory].filter(Boolean) as Product[];
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

export function scoreOutfit(outfit: OutfitCandidate, context?: { targetWarmth?: number; targetSeason?: string }): MatchScore {
  const colorMatch = scoreColorMatch(outfit);
  const toneMatch = scoreToneMatch(outfit);
  const patternBalance = scorePatternBalance(outfit);
  const formalityMatch = scoreFormalityMatch(outfit);
  const warmthMatch = scoreWarmthMatch(outfit, context?.targetWarmth);
  const seasonMatch = scoreSeasonMatch(outfit, context?.targetSeason);
  const silhouetteBalance = scoreSilhouetteBalance(outfit);

  const weights = {
    colorMatch: 0.22,
    toneMatch: 0.17,
    patternBalance: 0.17,
    formalityMatch: 0.13,
    warmthMatch: 0.08,
    seasonMatch: 0.08,
    silhouetteBalance: 0.15,
  };

  const totalScore =
    colorMatch * weights.colorMatch +
    toneMatch * weights.toneMatch +
    patternBalance * weights.patternBalance +
    formalityMatch * weights.formalityMatch +
    warmthMatch * weights.warmthMatch +
    seasonMatch * weights.seasonMatch +
    silhouetteBalance * weights.silhouetteBalance;

  return {
    score: Math.round(totalScore),
    breakdown: {
      colorMatch: Math.round(colorMatch),
      toneMatch: Math.round(toneMatch),
      patternBalance: Math.round(patternBalance),
      formalityMatch: Math.round(formalityMatch),
      warmthMatch: Math.round(warmthMatch),
      seasonMatch: Math.round(seasonMatch),
      silhouetteBalance: Math.round(silhouetteBalance),
    },
  };
}

function shouldIncludeOuter(targetSeason?: string, targetWarmth?: number): boolean {
  if (targetSeason === 'summer') return false;
  if (targetWarmth !== undefined && targetWarmth <= 2) return false;
  return true;
}

function getOutfitColorKey(outfit: OutfitCandidate): string {
  const colors = [outfit.outer, outfit.top, outfit.bottom, outfit.shoes]
    .filter(Boolean)
    .map(item => getColorFamily(item as Product))
    .filter(Boolean)
    .sort();
  return colors.join('-');
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
