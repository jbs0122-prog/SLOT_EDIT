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
  multi: ['black', 'white', 'grey', 'navy', 'beige']
};

export function scoreColorMatch(outfit: OutfitCandidate): number {
  const items = [outfit.outer, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory].filter(Boolean) as Product[];

  if (items.length < 3) return 0;

  let score = 100;
  const colorFamilies = items.map(item => (item as any).color_family).filter(Boolean);

  if (colorFamilies.length < items.length) {
    return 50;
  }

  const neutralCount = colorFamilies.filter(c => NEUTRAL_COLORS.includes(c)).length;
  const accentColors = colorFamilies.filter(c => !NEUTRAL_COLORS.includes(c));

  if (accentColors.length > 2) {
    score -= 30;
  }

  for (let i = 0; i < colorFamilies.length; i++) {
    for (let j = i + 1; j < colorFamilies.length; j++) {
      const color1 = colorFamilies[i];
      const color2 = colorFamilies[j];

      if (color1 === color2) {
        if (NEUTRAL_COLORS.includes(color1)) {
          score += 5;
        } else {
          score -= 10;
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

  if (neutralCount >= items.length - 1) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

export function scoreToneMatch(outfit: OutfitCandidate): number {
  const items = [outfit.outer, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory].filter(Boolean) as Product[];

  if (items.length < 3) return 0;

  let score = 100;
  const tones = items.map(item => (item as any).color_tone).filter(Boolean);

  if (tones.length < items.length) {
    return 50;
  }

  const toneSet = new Set(tones);
  const neutralCount = tones.filter(t => t === 'neutral').length;
  const warmCount = tones.filter(t => t === 'warm').length;
  const coolCount = tones.filter(t => t === 'cool').length;

  if (warmCount > 0 && coolCount > 0) {
    const mixRatio = Math.min(warmCount, coolCount) / Math.max(warmCount, coolCount);
    if (mixRatio > 0.5 && neutralCount === 0) {
      score -= 20;
    } else if (mixRatio > 0.3) {
      score -= 10;
    }
  }

  if (toneSet.size === 1 || (toneSet.size === 2 && tones.includes('neutral'))) {
    score += 15;
  }

  return Math.max(0, Math.min(100, score));
}

export function scorePatternBalance(outfit: OutfitCandidate): number {
  const items = [outfit.outer, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory].filter(Boolean) as Product[];

  if (items.length < 3) return 0;

  let score = 100;
  const patterns = items.map(item => (item as any).pattern).filter(Boolean);

  if (patterns.length < items.length) {
    return 50;
  }

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
      score -= 5;
    } else {
      score += 5;
    }
  } else if (patternedCount >= 3) {
    score -= 25;
  }

  const visiblePatterns = [
    (outfit.outer as any)?.pattern,
    (outfit.top as any)?.pattern,
    (outfit.bottom as any)?.pattern
  ].filter(Boolean).filter(p => p !== 'solid');

  if (visiblePatterns.length > 2) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

export function scoreFormalityMatch(outfit: OutfitCandidate): number {
  const items = [outfit.outer, outfit.top, outfit.bottom, outfit.shoes].filter(Boolean) as Product[];

  if (items.length < 3) return 0;

  let score = 100;
  const formalities = items.map(item => (item as any).formality).filter((f): f is number => typeof f === 'number');

  if (formalities.length < items.length) {
    return 50;
  }

  const avg = formalities.reduce((sum, f) => sum + f, 0) / formalities.length;
  let totalDeviation = 0;

  for (const formality of formalities) {
    const deviation = Math.abs(formality - avg);
    totalDeviation += deviation;

    if (deviation > 2) {
      score -= 20;
    } else if (deviation > 1) {
      score -= 10;
    }
  }

  const avgDeviation = totalDeviation / formalities.length;
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
  const warmths = items.map(item => (item as any).warmth).filter((w): w is number => typeof w === 'number');

  if (warmths.length < items.length) {
    return 50;
  }

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
    const seasons = (item as any).season || [];
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

export function scoreOutfit(outfit: OutfitCandidate, context?: { targetWarmth?: number; targetSeason?: string }): MatchScore {
  const colorMatch = scoreColorMatch(outfit);
  const toneMatch = scoreToneMatch(outfit);
  const patternBalance = scorePatternBalance(outfit);
  const formalityMatch = scoreFormalityMatch(outfit);
  const warmthMatch = scoreWarmthMatch(outfit, context?.targetWarmth);
  const seasonMatch = scoreSeasonMatch(outfit, context?.targetSeason);

  const weights = {
    colorMatch: 0.25,
    toneMatch: 0.20,
    patternBalance: 0.20,
    formalityMatch: 0.15,
    warmthMatch: 0.10,
    seasonMatch: 0.10,
  };

  const totalScore =
    colorMatch * weights.colorMatch +
    toneMatch * weights.toneMatch +
    patternBalance * weights.patternBalance +
    formalityMatch * weights.formalityMatch +
    warmthMatch * weights.warmthMatch +
    seasonMatch * weights.seasonMatch;

  return {
    score: Math.round(totalScore),
    breakdown: {
      colorMatch: Math.round(colorMatch),
      toneMatch: Math.round(toneMatch),
      patternBalance: Math.round(patternBalance),
      formalityMatch: Math.round(formalityMatch),
      warmthMatch: Math.round(warmthMatch),
      seasonMatch: Math.round(seasonMatch),
    },
  };
}

function shouldIncludeOuter(targetSeason?: string, targetWarmth?: number): boolean {
  if (targetSeason === 'summer' || targetSeason === '여름') {
    return false;
  }

  if (targetWarmth !== undefined) {
    if (targetWarmth <= 2) {
      return false;
    }
  }

  return true;
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

  const combinations: OutfitCandidate[] = [];
  const maxCombinations = 500;

  if (tops.length === 0 || bottoms.length === 0 || shoes.length === 0) {
    return combinations;
  }

  for (const outer of outers.length > 0 ? outers : [undefined]) {
    for (const top of tops) {
      for (const bottom of bottoms) {
        for (const shoe of shoes) {
          for (const bag of bags.length > 0 ? bags : [undefined]) {
            for (const accessory of accessories.length > 0 ? accessories : [undefined]) {
              const outfit: OutfitCandidate = {
                top,
                bottom,
                shoes: shoe,
              };

              if (outer) outfit.outer = outer;
              if (bag) outfit.bag = bag;
              if (accessory) outfit.accessory = accessory;

              combinations.push(outfit);

              if (combinations.length >= maxCombinations) {
                return combinations;
              }
            }
          }
        }
      }
    }
  }

  return combinations;
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

  return scoredOutfits.slice(0, topN);
}
