import { Product, OutfitItem } from '../data/outfits';
import { VIBE_ITEM_DATABASE, VibeKey, SlotCategory } from '../data/vibeItemDatabase';
import { getVibeDNA, getLookDNA } from '../data/vibeItems/vibeDna';
import { LookKey } from '../data/vibeItems/types';
import { scoreProductForVibe, type VibeCompatScore } from './vibeCompatibility';
import { resolveColorFamily, getColorHarmonyScore, getColorDNA, type ColorDNA } from './matching/colorDna';
import { getVibeItemAffinity } from './matching/vibeAffinity';

export interface RegisteredRecommendation {
  product: Product;
  score: number;
  vibeScore: VibeCompatScore;
  colorHarmonyAvg: number;
  reasons: string[];
}

export interface UnregisteredRecommendation {
  itemName: string;
  slotType: string;
  suggestedColors: string[];
  suggestedMaterials: string[];
  suggestedSilhouettes: string[];
  formalityHint: { level: number; label: string };
  tonalHint: string;
  colorHarmonyNote: string;
  lookName: string;
  vibeAffinity: number;
}

export interface SlotRecommendations {
  slotType: string;
  slotLabel: string;
  registered: RegisteredRecommendation[];
  unregistered: UnregisteredRecommendation[];
}

const SLOT_LABEL_MAP: Record<string, string> = {
  outer: '아우터',
  mid: '미드레이어',
  top: '상의',
  bottom: '하의',
  shoes: '신발',
  bag: '가방',
  accessory: '액세서리 1',
  accessory_2: '액세서리 2',
};

const SLOT_TO_CATEGORY: Record<string, string> = {
  outer: 'outer',
  mid: 'mid',
  top: 'top',
  bottom: 'bottom',
  shoes: 'shoes',
  bag: 'bag',
  accessory: 'accessory',
  accessory_2: 'accessory',
};

function getFilledColors(linkedItems: OutfitItem[]): ColorDNA[] {
  return linkedItems
    .filter(item => item.product)
    .map(item => {
      const cf = resolveColorFamily(item.product!.color || '', item.product!.color_family);
      return getColorDNA(cf);
    })
    .filter(dna => dna.family);
}

function getFilledColorFamilies(linkedItems: OutfitItem[]): string[] {
  return linkedItems
    .filter(item => item.product)
    .map(item => resolveColorFamily(item.product!.color || '', item.product!.color_family))
    .filter(Boolean);
}

function computeColorHarmonyWithExisting(product: Product, existingColorFamilies: string[]): number {
  if (existingColorFamilies.length === 0) return 75;

  const productFamily = resolveColorFamily(product.color || '', product.color_family);
  if (!productFamily) return 50;

  const scores = existingColorFamilies.map(cf => getColorHarmonyScore(productFamily, cf));
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

function computeSeasonMatch(product: Product, targetSeason?: string): number {
  if (!targetSeason) return 1;
  const seasons = product.season || [];
  if (seasons.length === 0) return 0.7;
  return seasons.includes(targetSeason) ? 1 : 0.3;
}

function computeBodyTypeMatch(product: Product, bodyType?: string): number {
  if (!bodyType) return 1;
  const types = product.body_type || [];
  if (types.length === 0) return 0.7;
  return types.includes(bodyType) ? 1 : 0.5;
}

function buildReasons(
  vibeScore: VibeCompatScore,
  colorHarmonyAvg: number,
  seasonMatch: number,
  vibeItemAffinity: number
): string[] {
  const reasons: string[] = [];

  if (vibeScore.vibeMatchScore >= 100) reasons.push('Vibe 일치');
  if (vibeScore.colorTier === 'primary') reasons.push('팔레트 Primary');
  else if (vibeScore.colorTier === 'secondary') reasons.push('팔레트 Secondary');

  if (colorHarmonyAvg >= 85) reasons.push('컬러 조화 우수');
  else if (colorHarmonyAvg >= 75) reasons.push('컬러 조화 양호');

  if (vibeItemAffinity >= 0.8) reasons.push('스타일 정확 매칭');
  else if (vibeItemAffinity >= 0.5) reasons.push('스타일 유사');

  if (vibeScore.materialScore >= 85) reasons.push('소재 적합');

  if (seasonMatch >= 1) reasons.push('시즌 적합');

  return reasons;
}

export function getSlotRecommendations(
  slotType: string,
  allProducts: Product[],
  linkedItems: OutfitItem[],
  outfitVibe: string,
  outfitGender: string,
  outfitBodyType?: string,
  outfitSeason?: string,
  maxRegistered: number = 5,
  maxUnregistered: number = 3
): SlotRecommendations {
  const category = SLOT_TO_CATEGORY[slotType] || slotType;
  const existingColorFamilies = getFilledColorFamilies(linkedItems);
  const linkedProductIds = new Set(linkedItems.map(item => item.product_id));

  const candidates = allProducts.filter(p => {
    if (linkedProductIds.has(p.id)) return false;
    if (p.gender !== outfitGender && p.gender !== 'UNISEX') return false;
    if (p.category !== category) return false;
    return true;
  });

  const scored: RegisteredRecommendation[] = candidates.map(product => {
    const vibeScore = scoreProductForVibe(product, outfitVibe);
    const colorHarmonyAvg = computeColorHarmonyWithExisting(product, existingColorFamilies);
    const seasonMatch = computeSeasonMatch(product, outfitSeason);
    const bodyTypeMatch = computeBodyTypeMatch(product, outfitBodyType);
    const vibeItemAffinity = getVibeItemAffinity(product, outfitVibe);

    const score = Math.round(
      vibeScore.total * 0.35 +
      colorHarmonyAvg * 0.30 +
      seasonMatch * 20 +
      bodyTypeMatch * 10 +
      vibeItemAffinity * 5
    );

    const reasons = buildReasons(vibeScore, colorHarmonyAvg, seasonMatch, vibeItemAffinity);

    return { product, score, vibeScore, colorHarmonyAvg, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  const registered = scored.slice(0, maxRegistered);

  const unregistered = getUnregisteredRecommendations(
    slotType,
    outfitVibe,
    allProducts,
    linkedItems,
    existingColorFamilies,
    maxUnregistered
  );

  return {
    slotType,
    slotLabel: SLOT_LABEL_MAP[slotType] || slotType,
    registered,
    unregistered,
  };
}

const SILHOUETTE_KEYWORDS: Record<string, string[]> = {
  oversized: ['oversized', 'boxy', 'oversize', 'baggy', 'wide', 'loose', 'relaxed', 'boyfriend'],
  fitted: ['fitted', 'slim', 'skinny', 'tailored', 'cigarette', 'pencil', 'structured', 'cropped'],
  regular: ['regular', 'straight', 'classic', 'standard'],
  flared: ['flared', 'flare', 'bootcut', 'a-line', 'pleated', 'wide-leg'],
  layered: ['layered', 'wrap', 'draped', 'asymmetric', 'double-breasted', 'cape'],
};

const FORMALITY_ITEM_KEYWORDS: Record<string, number> = {
  tuxedo: 9, blazer: 7, trench: 7, coat: 6, dress_shirt: 7, slacks: 7,
  loafer: 6, oxford: 7, heel: 7, derby: 7, clutch: 6, briefcase: 7,
  blouse: 5, cardigan: 4, polo: 4, chino: 4, vest: 5, knit: 4,
  turtleneck: 5, shirt: 5, boot: 4, tote: 4, watch: 5,
  hoodie: 2, sweatshirt: 2, t_shirt: 2, tee: 2, jeans: 2, denim: 2,
  sneaker: 2, jogger: 1, shorts: 2, cargo: 2, sandal: 1, cap: 1,
  backpack: 2, beanie: 2, puffer: 2, track: 1, windbreaker: 1,
};

function inferFormalityFromName(itemName: string): number {
  const lower = itemName.toLowerCase();
  for (const [keyword, level] of Object.entries(FORMALITY_ITEM_KEYWORDS)) {
    if (lower.includes(keyword.replace(/_/g, ' ')) || lower.includes(keyword)) return level;
  }
  return 4;
}

function getFormalityLabel(level: number): string {
  if (level >= 8) return 'Very Formal';
  if (level >= 6) return 'Formal';
  if (level >= 4) return 'Smart Casual';
  if (level >= 2) return 'Casual';
  return 'Very Casual';
}

function inferSilhouettesFromName(itemName: string): string[] {
  const lower = itemName.toLowerCase();
  const matched: string[] = [];
  for (const [silhouette, keywords] of Object.entries(SILHOUETTE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) matched.push(silhouette);
  }
  return matched.length > 0 ? matched : ['regular'];
}

function computeTonalHint(
  existingColorFamilies: string[],
  palette: { primary: string[]; secondary: string[]; accent: string[] },
  tonalStrategies: string[]
): string {
  if (existingColorFamilies.length === 0) return tonalStrategies[0] || 'tone-on-tone';

  const existingDNAs = existingColorFamilies.map(cf => getColorDNA(cf)).filter(d => d.family);
  const tones = existingDNAs.map(d => d.tone);
  const warmCount = tones.filter(t => t === 'warm').length;
  const coolCount = tones.filter(t => t === 'cool').length;

  if (tonalStrategies.includes('contrast') && existingDNAs.length >= 2) {
    const lightnesses = existingDNAs.map(d => d.lightness);
    const range = Math.max(...lightnesses) - Math.min(...lightnesses);
    if (range < 30) return 'contrast';
  }

  if (warmCount > coolCount) return 'warm tone-on-tone';
  if (coolCount > warmCount) return 'cool tone-on-tone';
  return tonalStrategies[0] || 'tone-on-tone';
}

function computeColorHarmonyNote(
  suggestedColors: string[],
  existingColorFamilies: string[]
): string {
  if (existingColorFamilies.length === 0 || suggestedColors.length === 0) return '';

  let totalScore = 0;
  let count = 0;
  for (const suggested of suggestedColors) {
    for (const existing of existingColorFamilies) {
      totalScore += getColorHarmonyScore(suggested, existing);
      count++;
    }
  }

  if (count === 0) return '';
  const avg = totalScore / count;
  if (avg >= 90) return '조화도 최상';
  if (avg >= 80) return '조화도 우수';
  if (avg >= 70) return '조화도 양호';
  if (avg >= 55) return '조화도 보통';
  return '대비 효과';
}

function computeRealVibeAffinity(
  itemName: string,
  lookKey: string,
  slotCategory: SlotCategory,
  vk: VibeKey,
  dnaFormality: [number, number],
  dnaSilhouettes: string[]
): number {
  const formality = inferFormalityFromName(itemName);
  const [minF, maxF] = dnaFormality;
  const formalityFit = (formality >= minF && formality <= maxF) ? 1.0 :
    (formality >= minF - 1 && formality <= maxF + 1) ? 0.7 : 0.3;

  const silhouettes = inferSilhouettesFromName(itemName);
  const silhouetteFit = silhouettes.some(s => {
    if (s === 'oversized' && dnaSilhouettes.includes('V')) return true;
    if (s === 'fitted' && (dnaSilhouettes.includes('I') || dnaSilhouettes.includes('X'))) return true;
    if (s === 'flared' && dnaSilhouettes.includes('A')) return true;
    if (s === 'regular') return true;
    return false;
  }) ? 1.0 : 0.5;

  const coreSlots: SlotCategory[] = ['top', 'bottom', 'shoes'];
  const slotWeight = coreSlots.includes(slotCategory) ? 1.0 : 0.85;

  return Math.min(1.0, (formalityFit * 0.4 + silhouetteFit * 0.35 + slotWeight * 0.25));
}

function getUnregisteredRecommendations(
  slotType: string,
  vibeKey: string,
  allProducts: Product[],
  linkedItems: OutfitItem[],
  existingColorFamilies: string[],
  maxCount: number
): UnregisteredRecommendation[] {
  const vk = vibeKey as VibeKey;
  const vibeDef = VIBE_ITEM_DATABASE[vk];
  if (!vibeDef) return [];

  let dna;
  try {
    dna = getVibeDNA(vk);
  } catch {
    return [];
  }

  const slotCategory = (slotType === 'mid' ? 'top' :
    slotType === 'accessory_2' ? 'accessory' : slotType) as SlotCategory;

  const allItemNames = new Set<string>();
  const lookItemMap = new Map<string, { lookName: string; lookKey: string }>();

  for (const [lookKey, lookDef] of Object.entries(vibeDef.looks)) {
    const slotItems = lookDef.slots[slotCategory];
    if (!slotItems) continue;
    for (const itemName of slotItems) {
      const normalized = itemName.toLowerCase();
      if (!allItemNames.has(normalized)) {
        allItemNames.add(normalized);
        lookItemMap.set(normalized, { lookName: lookDef.name, lookKey });
      }
    }
  }

  const registeredCategory = slotType === 'accessory_2' ? 'accessory' : slotType;
  const registeredProductTerms = allProducts
    .filter(p => p.category === registeredCategory && p.gender === linkedItems[0]?.product?.gender)
    .flatMap(p => {
      const terms: string[] = [];
      if (p.sub_category) terms.push(p.sub_category.toLowerCase());
      if (p.name) terms.push(p.name.toLowerCase());
      return terms;
    });

  interface UnmatchedItem {
    name: string;
    lookName: string;
    lookKey: string;
    affinity: number;
  }

  const unmatched: UnmatchedItem[] = [];

  for (const [normalized, lookInfo] of lookItemMap.entries()) {
    const isRegistered = registeredProductTerms.some(term => {
      const words = normalized.split(/\s+/);
      return words.some(w => w.length >= 4 && term.includes(w));
    });

    if (!isRegistered) {
      let lookDna = dna;
      try {
        lookDna = getLookDNA(vk, lookInfo.lookKey as LookKey);
      } catch { /* use base dna */ }

      const affinity = computeRealVibeAffinity(
        normalized,
        lookInfo.lookKey,
        slotCategory,
        vk,
        lookDna.formality_range,
        lookDna.silhouette_preference
      );
      unmatched.push({ name: normalized, lookName: lookInfo.lookName, lookKey: lookInfo.lookKey, affinity });
    }
  }

  unmatched.sort((a, b) => b.affinity - a.affinity);

  const lookMaterials = new Map<string, string[]>();
  for (const [, lookDef] of Object.entries(vibeDef.looks)) {
    lookMaterials.set(lookDef.name, lookDef.materials);
  }

  const tonalHint = computeTonalHint(
    existingColorFamilies,
    dna.color_palette,
    dna.preferred_tonal_strategy
  );

  return unmatched.slice(0, maxCount).map(item => {
    let lookDna = dna;
    try {
      lookDna = getLookDNA(vk, item.lookKey as LookKey);
    } catch { /* use base dna */ }

    const suggestedColors = getSuggestedColorsForSlot(
      lookDna.color_palette,
      existingColorFamilies,
      slotCategory
    );

    const lookMats = lookMaterials.get(item.lookName) || [];
    const suggestedMaterials = getSlotSpecificMaterials(lookMats, slotCategory, item.name);

    const silhouettes = inferSilhouettesFromName(item.name);
    const formality = inferFormalityFromName(item.name);

    return {
      itemName: item.name,
      slotType,
      suggestedColors,
      suggestedMaterials,
      suggestedSilhouettes: silhouettes,
      formalityHint: { level: formality, label: getFormalityLabel(formality) },
      tonalHint,
      colorHarmonyNote: computeColorHarmonyNote(suggestedColors, existingColorFamilies),
      lookName: item.lookName,
      vibeAffinity: Math.round(item.affinity * 100) / 100,
    };
  });
}

function getSlotSpecificMaterials(
  lookMaterials: string[],
  slotCategory: SlotCategory,
  itemName: string
): string[] {
  const SLOT_MATERIAL_AFFINITY: Record<string, string[]> = {
    outer: ['wool', 'leather', 'nylon', 'cashmere', 'denim', 'tweed', 'suede'],
    top: ['cotton', 'silk', 'linen', 'knit', 'jersey', 'cashmere'],
    bottom: ['wool', 'cotton', 'denim', 'leather', 'linen'],
    shoes: ['leather', 'suede', 'canvas', 'rubber', 'nylon'],
    bag: ['leather', 'canvas', 'nylon', 'suede'],
    accessory: ['metal', 'leather', 'silk', 'fabric'],
  };

  const slotPreferred = SLOT_MATERIAL_AFFINITY[slotCategory] || [];
  const lower = itemName.toLowerCase();

  const fromName: string[] = [];
  const matKeywords = ['leather', 'suede', 'wool', 'cotton', 'silk', 'linen', 'denim', 'knit',
    'nylon', 'velvet', 'cashmere', 'canvas', 'corduroy', 'tweed', 'satin', 'mesh',
    'fleece', 'jersey', 'rubber', 'metal', 'silver', 'gold', 'tech', 'quilted', 'waxed'];
  for (const kw of matKeywords) {
    if (lower.includes(kw)) fromName.push(kw);
  }

  if (fromName.length > 0) {
    const extra = lookMaterials.filter(m => !fromName.includes(m)).slice(0, 2);
    return [...fromName, ...extra].slice(0, 4);
  }

  const matched = lookMaterials.filter(m =>
    slotPreferred.some(sp => m.toLowerCase().includes(sp))
  );

  if (matched.length >= 2) return matched.slice(0, 4);
  return [...matched, ...lookMaterials.filter(m => !matched.includes(m))].slice(0, 4);
}

function getSuggestedColorsForSlot(
  palette: { primary: string[]; secondary: string[]; accent: string[] },
  existingColors: string[],
  slotCategory: SlotCategory
): string[] {
  const existing = new Set(existingColors);
  const isCore = ['top', 'bottom', 'outer'].includes(slotCategory);

  const scoredColors: Array<{ color: string; score: number }> = [];

  for (const color of palette.primary) {
    let score = 100;
    if (existing.has(color)) score -= 15;
    for (const ec of existingColors) {
      score += getColorHarmonyScore(color, ec) * 0.3;
    }
    scoredColors.push({ color, score });
  }

  for (const color of palette.secondary) {
    let score = 70;
    if (existing.has(color)) score -= 15;
    for (const ec of existingColors) {
      score += getColorHarmonyScore(color, ec) * 0.25;
    }
    scoredColors.push({ color, score });
  }

  if (!isCore) {
    for (const color of palette.accent) {
      let score = 40;
      for (const ec of existingColors) {
        score += getColorHarmonyScore(color, ec) * 0.2;
      }
      scoredColors.push({ color, score });
    }
  }

  scoredColors.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const { color } of scoredColors) {
    if (!seen.has(color) && result.length < 3) {
      seen.add(color);
      result.push(color);
    }
  }
  return result;
}

function getSuggestedColors(
  palette: { primary: string[]; secondary: string[]; accent: string[] },
  existingColors: string[]
): string[] {
  const existing = new Set(existingColors);
  const suggestions: string[] = [];

  for (const color of palette.primary) {
    if (!existing.has(color) && suggestions.length < 3) {
      suggestions.push(color);
    }
  }

  if (suggestions.length < 3) {
    for (const color of palette.secondary) {
      if (!existing.has(color) && suggestions.length < 3) {
        suggestions.push(color);
      }
    }
  }

  if (suggestions.length === 0) {
    suggestions.push(...palette.primary.slice(0, 2));
  }

  return suggestions;
}

export function getAllSlotRecommendations(
  allProducts: Product[],
  linkedItems: OutfitItem[],
  outfitVibe: string,
  outfitGender: string,
  outfitBodyType?: string,
  outfitSeason?: string
): SlotRecommendations[] {
  const allSlots = ['outer', 'mid', 'top', 'bottom', 'shoes', 'bag', 'accessory', 'accessory_2'];
  const filledSlots = new Set(linkedItems.map(item => item.slot_type));

  return allSlots
    .filter(slot => !filledSlots.has(slot))
    .map(slot =>
      getSlotRecommendations(
        slot,
        allProducts,
        linkedItems,
        outfitVibe,
        outfitGender,
        outfitBodyType,
        outfitSeason
      )
    );
}

export const COLOR_CHIP_MAP: Record<string, string> = {
  black: '#1a1a1a', white: '#fafafa', grey: '#9ca3af', charcoal: '#374151',
  navy: '#1e3a5f', beige: '#d4c5a9', cream: '#f5f0e1', ivory: '#faf8f0',
  brown: '#6b4226', tan: '#c19a6b', camel: '#c19a6b', olive: '#6b7c3e',
  khaki: '#b5a67d', sage: '#87a96b', rust: '#b7410e', mustard: '#d4a017',
  burgundy: '#6c1d45', wine: '#722f37', red: '#dc2626', blue: '#3b82f6',
  green: '#22c55e', yellow: '#eab308', orange: '#f97316', pink: '#ec4899',
  purple: '#a855f7', coral: '#f87171', teal: '#14b8a6', denim: '#4a6fa5',
  metallic: '#a8a29e', gold: '#d4a017', silver: '#9ca3af',
};
