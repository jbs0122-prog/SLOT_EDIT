import { Product } from '../data/outfits';
import { OutfitCandidate, MatchScore } from './matchingEngine';

const NEUTRAL_COLORS = ['black', 'white', 'grey', 'beige', 'navy'];
const EARTH_TONES = ['beige', 'brown', 'green', 'orange'];

const COLOR_HARMONY_RULES: Record<string, string[]> = {
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

const SILHOUETTE_BALANCE: Record<string, string[]> = {
  oversized: ['slim', 'fitted', 'straight', 'tapered'],
  relaxed: ['slim', 'fitted', 'straight', 'tapered'],
  wide: ['fitted', 'slim'],
  fitted: ['wide', 'relaxed', 'oversized', 'straight'],
  slim: ['wide', 'relaxed', 'oversized', 'regular'],
  regular: ['slim', 'fitted', 'wide', 'relaxed', 'oversized'],
  straight: ['fitted', 'slim', 'oversized', 'relaxed'],
  tapered: ['relaxed', 'oversized', 'regular', 'wide'],
};

const MATERIAL_GROUPS: Record<string, string[]> = {
  luxe: ['silk', 'satin', 'velvet', 'cashmere', 'chiffon', 'organza'],
  structured: ['denim', 'leather', 'tweed', 'suede', 'corduroy'],
  classic: ['wool', 'cotton', 'linen'],
  casual: ['jersey', 'fleece', 'sweatshirt', 'terry', 'neoprene'],
  knit: ['knit', 'crochet', 'ribbed', 'cable-knit', 'mohair'],
  technical: ['nylon', 'polyester', 'gore-tex', 'spandex', 'mesh', 'windbreaker'],
};

const MATERIAL_COMPAT: Record<string, number> = {
  'luxe-luxe': 1, 'luxe-classic': 0.8, 'luxe-structured': 0.6,
  'luxe-knit': 0.5, 'luxe-casual': 0.3, 'luxe-technical': 0.2,
  'structured-structured': 1, 'structured-classic': 0.9, 'structured-casual': 0.6,
  'structured-knit': 0.6, 'structured-technical': 0.5,
  'classic-classic': 1, 'classic-casual': 0.8, 'classic-knit': 0.8, 'classic-technical': 0.5,
  'casual-casual': 1, 'casual-knit': 0.9, 'casual-technical': 0.7,
  'knit-knit': 1, 'knit-technical': 0.5,
  'technical-technical': 1,
};

const SUB_CATEGORY_STYLE: Record<string, string> = {
  blazer: 'formal', suit_jacket: 'formal', dress_shirt: 'formal', blouse: 'formal',
  slacks: 'formal', dress_pants: 'formal', pencil_skirt: 'formal', trench_coat: 'formal',
  oxford: 'formal', loafer: 'formal', heel: 'formal', derby: 'formal',
  clutch: 'formal', structured_bag: 'formal',

  cardigan: 'smart_casual', polo: 'smart_casual', chino: 'smart_casual',
  midi_skirt: 'smart_casual', ankle_boot: 'smart_casual', knit_vest: 'smart_casual',
  tote: 'smart_casual', shoulder_bag: 'smart_casual', watch: 'smart_casual',

  t_shirt: 'casual', hoodie: 'casual', sweatshirt: 'casual', denim_jacket: 'casual',
  jeans: 'casual', jogger: 'casual', shorts: 'casual', cargo: 'casual',
  sneaker: 'casual', sandal: 'casual', canvas: 'casual',
  backpack: 'casual', crossbody: 'casual', cap: 'casual', beanie: 'casual',

  track_jacket: 'sporty', windbreaker: 'sporty', puffer: 'sporty',
  legging: 'sporty', track_pants: 'sporty', biker_shorts: 'sporty',
  running_shoe: 'sporty', training_shoe: 'sporty', sports_bag: 'sporty',
};

const STYLE_COMPAT: Record<string, Record<string, number>> = {
  formal: { formal: 1, smart_casual: 0.7, casual: 0.3, sporty: 0.1 },
  smart_casual: { formal: 0.7, smart_casual: 1, casual: 0.8, sporty: 0.4 },
  casual: { formal: 0.3, smart_casual: 0.8, casual: 1, sporty: 0.7 },
  sporty: { formal: 0.1, smart_casual: 0.4, casual: 0.7, sporty: 1 },
};

const COLOR_WHEEL = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];

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

function getMaterialGroup(material: string): string | null {
  const m = material.toLowerCase();
  for (const [group, materials] of Object.entries(MATERIAL_GROUPS)) {
    if (materials.some(mat => m.includes(mat))) return group;
  }
  return null;
}

function getMaterialCompatScore(g1: string, g2: string): number {
  return MATERIAL_COMPAT[`${g1}-${g2}`] ?? MATERIAL_COMPAT[`${g2}-${g1}`] ?? 0.5;
}

function getSubCategoryStyle(item: Product): string | null {
  const sub = (item.sub_category || '').toLowerCase().replace(/[\s-]/g, '_');
  return SUB_CATEGORY_STYLE[sub] || null;
}

function getColorWheelDistance(c1: string, c2: string): number {
  const i1 = COLOR_WHEEL.indexOf(c1);
  const i2 = COLOR_WHEEL.indexOf(c2);
  if (i1 === -1 || i2 === -1) return -1;
  const dist = Math.abs(i1 - i2);
  return Math.min(dist, COLOR_WHEEL.length - dist);
}

function getAllItems(outfit: OutfitCandidate): Product[] {
  return [outfit.outer, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory]
    .filter(Boolean) as Product[];
}

function getCoreItems(outfit: OutfitCandidate): Product[] {
  return [outfit.outer, outfit.top, outfit.bottom, outfit.shoes]
    .filter(Boolean) as Product[];
}

export function scoreColorMatch(outfit: OutfitCandidate): number {
  const items = getAllItems(outfit);
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
      const c1 = colorFamilies[i];
      const c2 = colorFamilies[j];

      if (c1 === c2) {
        score += NEUTRAL_COLORS.includes(c1) ? 3 : -8;
        continue;
      }

      if (COLOR_HARMONY_RULES[c1]?.includes(c2)) {
        score += 3;
      } else {
        score -= 15;
      }
    }
  }

  return Math.max(0, Math.min(100, score));
}

export function scoreToneMatch(outfit: OutfitCandidate): number {
  const items = getAllItems(outfit);
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
  const items = getAllItems(outfit);
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
    const nonSolid = patterns.filter(p => p !== 'solid');
    const unique = new Set(nonSolid);
    score += unique.size === 1 ? -10 : 3;
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
  const items = getCoreItems(outfit);
  if (items.length < 3) return 0;

  let score = 100;
  const formalities = items.map(getFormality).filter((f): f is number => typeof f === 'number');

  if (formalities.length === 0) return 50;
  if (formalities.length < Math.ceil(items.length * 0.5)) return 50;

  const avg = formalities.reduce((sum, f) => sum + f, 0) / formalities.length;

  for (const formality of formalities) {
    const deviation = Math.abs(formality - avg);
    if (deviation > 2) score -= 20;
    else if (deviation > 1) score -= 10;
  }

  const avgDeviation = formalities.reduce((sum, f) => sum + Math.abs(f - avg), 0) / formalities.length;
  if (avgDeviation < 0.5) score += 15;

  const range = Math.max(...formalities) - Math.min(...formalities);
  if (range > 2) score -= 15;

  return Math.max(0, Math.min(100, score));
}

export function scoreWarmthMatch(outfit: OutfitCandidate, targetWarmth?: number): number {
  const items = getCoreItems(outfit);
  if (items.length < 3) return 0;

  let score = 100;
  const warmths = items.map(getWarmth).filter((w): w is number => typeof w === 'number');

  if (warmths.length === 0) return 50;
  if (warmths.length < Math.ceil(items.length * 0.5)) return 50;

  const avg = warmths.reduce((sum, w) => sum + w, 0) / warmths.length;

  if (targetWarmth) {
    const targetDeviation = Math.abs(avg - targetWarmth);
    if (targetDeviation > 1.5) score -= 30;
    else if (targetDeviation > 1) score -= 15;
    else score += 10;
  }

  const range = Math.max(...warmths) - Math.min(...warmths);
  if (range > 2) score -= 20;
  else if (range <= 1) score += 10;

  return Math.max(0, Math.min(100, score));
}

export function scoreSeasonMatch(outfit: OutfitCandidate, targetSeason?: string): number {
  const items = getCoreItems(outfit);
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

  if (matchCount === items.length) score += 15;

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
    if (topSil === 'oversized' || topSil === 'wide') score -= 20;
    else if (topSil === 'fitted' || topSil === 'slim') score -= 5;
  }

  if (outfit.outer) {
    const outerSil = getSilhouette(outfit.outer);
    if (outerSil === 'oversized' && topSil === 'oversized') score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

export function scoreMaterialCompat(outfit: OutfitCandidate): number {
  const items = getCoreItems(outfit);
  const materials = items.map(item => item.material || '').filter(Boolean);

  if (materials.length < 2) return 50;

  const groups = materials.map(getMaterialGroup).filter(Boolean) as string[];
  if (groups.length < 2) return 50;

  let totalCompat = 0;
  let pairCount = 0;

  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      totalCompat += getMaterialCompatScore(groups[i], groups[j]);
      pairCount++;
    }
  }

  return Math.round((totalCompat / pairCount) * 100);
}

export function scoreSubCategoryMatch(outfit: OutfitCandidate): number {
  const items = getCoreItems(outfit);
  const styles = items.map(getSubCategoryStyle).filter(Boolean) as string[];

  if (styles.length < 2) return 50;

  let totalCompat = 0;
  let pairCount = 0;

  for (let i = 0; i < styles.length; i++) {
    for (let j = i + 1; j < styles.length; j++) {
      totalCompat += STYLE_COMPAT[styles[i]]?.[styles[j]] ?? 0.5;
      pairCount++;
    }
  }

  return Math.round((totalCompat / pairCount) * 100);
}

export function scoreColorDepth(outfit: OutfitCandidate): number {
  const items = getCoreItems(outfit);
  const colors = items.map(getColorFamily).filter(Boolean);

  if (colors.length < 3) return 50;

  const neutrals = colors.filter(c => NEUTRAL_COLORS.includes(c));
  const accents = colors.filter(c => !NEUTRAL_COLORS.includes(c));
  const uniqueAccents = [...new Set(accents)];

  let score = 70;

  if (uniqueAccents.length <= 1 && neutrals.length >= 2) {
    score += 20;
  }

  if (uniqueAccents.length === 2) {
    const dist = getColorWheelDistance(uniqueAccents[0], uniqueAccents[1]);
    if (dist === 1) score += 15;
    else if (dist >= 3) score += 10;
  }

  const colorCounts = new Map<string, number>();
  colors.forEach(c => colorCounts.set(c, (colorCounts.get(c) || 0) + 1));
  const sortedCounts = [...colorCounts.values()].sort((a, b) => b - a);

  if (sortedCounts.length >= 2) {
    const baseRatio = sortedCounts[0] / colors.length;
    if (baseRatio >= 0.4 && baseRatio <= 0.7) score += 10;
  }

  const uniqueAll = new Set(colors);
  if (uniqueAll.size > 4) score -= 15;

  return Math.max(0, Math.min(100, score));
}

export function scoreMoodCoherence(outfit: OutfitCandidate): number {
  const items = getCoreItems(outfit);
  const vibeArrays = items.map(item => item.vibe || []).filter(v => v.length > 0);

  if (vibeArrays.length < 2) return 50;

  const vibeCounts = new Map<string, number>();
  vibeArrays.forEach(vibes => {
    vibes.forEach(v => vibeCounts.set(v, (vibeCounts.get(v) || 0) + 1));
  });

  const maxShared = Math.max(...vibeCounts.values());
  const shareRatio = maxShared / vibeArrays.length;

  let score: number;
  if (shareRatio >= 1) score = 100;
  else if (shareRatio >= 0.75) score = 85;
  else if (shareRatio >= 0.5) score = 70;
  else score = 50;

  const sharedVibes = [...vibeCounts.entries()].filter(([, count]) => count >= 2).length;
  if (sharedVibes >= 2) score += 10;

  return Math.max(0, Math.min(100, score));
}

export function scoreAccessoryHarmony(outfit: OutfitCandidate): number {
  const accessories = [outfit.bag, outfit.accessory].filter(Boolean) as Product[];
  if (accessories.length === 0) return 50;

  const mainItems = getCoreItems(outfit);
  const mainColors = mainItems.map(getColorFamily).filter(Boolean);
  const mainFormalities = mainItems.map(getFormality).filter((f): f is number => typeof f === 'number');

  let score = 70;

  for (const acc of accessories) {
    const accColor = getColorFamily(acc);
    const accFormality = getFormality(acc);

    if (accColor) {
      const isNeutral = NEUTRAL_COLORS.includes(accColor);
      const harmonizes = mainColors.some(c =>
        c === accColor || COLOR_HARMONY_RULES[c]?.includes(accColor)
      );

      if (isNeutral) score += 8;
      else if (harmonizes) score += 5;
      else score -= 10;
    }

    if (accFormality !== undefined && mainFormalities.length > 0) {
      const avgMain = mainFormalities.reduce((s, f) => s + f, 0) / mainFormalities.length;
      const deviation = Math.abs(accFormality - avgMain);
      if (deviation > 2) score -= 15;
      else if (deviation <= 1) score += 5;
    }
  }

  return Math.max(0, Math.min(100, score));
}

const WEIGHTS = {
  colorMatch: 0.16,
  toneMatch: 0.10,
  patternBalance: 0.10,
  formalityMatch: 0.10,
  warmthMatch: 0.06,
  seasonMatch: 0.06,
  silhouetteBalance: 0.12,
  materialCompat: 0.08,
  subCategoryMatch: 0.06,
  colorDepth: 0.06,
  moodCoherence: 0.06,
  accessoryHarmony: 0.04,
};

export function scoreOutfit(
  outfit: OutfitCandidate,
  context?: { targetWarmth?: number; targetSeason?: string }
): MatchScore {
  const colorMatch = scoreColorMatch(outfit);
  const toneMatch = scoreToneMatch(outfit);
  const patternBalance = scorePatternBalance(outfit);
  const formalityMatch = scoreFormalityMatch(outfit);
  const warmthMatch = scoreWarmthMatch(outfit, context?.targetWarmth);
  const seasonMatch = scoreSeasonMatch(outfit, context?.targetSeason);
  const silhouetteBalance = scoreSilhouetteBalance(outfit);
  const materialCompat = scoreMaterialCompat(outfit);
  const subCategoryMatch = scoreSubCategoryMatch(outfit);
  const colorDepth = scoreColorDepth(outfit);
  const moodCoherence = scoreMoodCoherence(outfit);
  const accessoryHarmony = scoreAccessoryHarmony(outfit);

  const totalScore =
    colorMatch * WEIGHTS.colorMatch +
    toneMatch * WEIGHTS.toneMatch +
    patternBalance * WEIGHTS.patternBalance +
    formalityMatch * WEIGHTS.formalityMatch +
    warmthMatch * WEIGHTS.warmthMatch +
    seasonMatch * WEIGHTS.seasonMatch +
    silhouetteBalance * WEIGHTS.silhouetteBalance +
    materialCompat * WEIGHTS.materialCompat +
    subCategoryMatch * WEIGHTS.subCategoryMatch +
    colorDepth * WEIGHTS.colorDepth +
    moodCoherence * WEIGHTS.moodCoherence +
    accessoryHarmony * WEIGHTS.accessoryHarmony;

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
      materialCompat: Math.round(materialCompat),
      subCategoryMatch: Math.round(subCategoryMatch),
      colorDepth: Math.round(colorDepth),
      moodCoherence: Math.round(moodCoherence),
      accessoryHarmony: Math.round(accessoryHarmony),
    },
  };
}
