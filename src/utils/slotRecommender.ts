import { Product, OutfitItem } from '../data/outfits';
import { VIBE_ITEM_DATABASE, VibeKey, SlotCategory } from '../data/vibeItemDatabase';
import { getVibeDNA, getLookDNA } from '../data/vibeItems/vibeDna';
import { LookKey } from '../data/vibeItems/types';
import { scoreProductForVibe, type VibeCompatScore, type VibeScoreContext } from './vibeCompatibility';
import { resolveColorFamily, getColorHarmonyScore, getColorDNA, type ColorDNA } from './matching/colorDna';
import { getVibeItemAffinity } from './matching/vibeAffinity';
import { inferMaterialGroup, getMaterialCompatScore, MATERIAL_GROUPS } from './matching/itemDna';
import { ITEM_WARMTH_LIMITS } from './matching/beamSearch';
import { computeImageFeatureScore } from './matching/contextLayer';

export interface RegisteredRecommendation {
  product: Product;
  score: number;
  vibeScore: VibeCompatScore;
  colorHarmonyAvg: number;
  reasons: string[];
}

export interface MaterialKeyword {
  material: string;
  group: string;
  compatScore: number;
  reason: 'vibe_preferred' | 'slot_fit' | 'harmony_with_existing' | 'texture_contrast';
}

export interface ColorKeyword {
  color: string;
  tier: 'primary' | 'secondary' | 'accent';
  harmonyScore: number;
  harmonyLabel: string;
}

export interface FitKeyword {
  silhouette: string;
  label: string;
  dnaMatch: boolean;
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
  colorKeywords: ColorKeyword[];
  materialKeywords: MaterialKeyword[];
  fitKeywords: FitKeyword[];
  textureHint: string;
  searchKeyword: string;
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

const SLOT_COLOR_WEIGHT: Record<string, number> = {
  outer: 1.5,
  top: 1.5,
  bottom: 1.5,
  mid: 1.2,
  shoes: 0.8,
  bag: 0.6,
  accessory: 0.4,
  accessory_2: 0.4,
};

function getFilledColorFamilies(linkedItems: OutfitItem[]): string[] {
  return linkedItems
    .filter(item => item.product)
    .map(item => resolveColorFamily(item.product!.color || '', item.product!.color_family))
    .filter(Boolean);
}

interface WeightedColorFamily {
  family: string;
  weight: number;
}

function getWeightedColorFamilies(linkedItems: OutfitItem[]): WeightedColorFamily[] {
  return linkedItems
    .filter(item => item.product)
    .map(item => ({
      family: resolveColorFamily(item.product!.color || '', item.product!.color_family),
      weight: SLOT_COLOR_WEIGHT[item.slot_type] ?? 1.0,
    }))
    .filter(wc => Boolean(wc.family));
}

function computeColorHarmonyWithExisting(product: Product, existingColorFamilies: string[], weightedColors?: WeightedColorFamily[]): number {
  if (existingColorFamilies.length === 0) return 75;

  const productFamily = resolveColorFamily(product.color || '', product.color_family);
  if (!productFamily) return 50;

  if (weightedColors && weightedColors.length > 0) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const wc of weightedColors) {
      const s = getColorHarmonyScore(productFamily, wc.family);
      weightedSum += s * wc.weight;
      totalWeight += wc.weight;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 75;
  }

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
  if (!bodyType) return 0;
  const types = product.body_type || [];
  if (types.length === 0) return 0;
  return types.includes(bodyType) ? 1 : -0.5;
}

function buildReasons(
  vibeScore: VibeCompatScore,
  colorHarmonyAvg: number,
  seasonMatch: number,
  vibeItemAffinity: number,
  imageCoherenceScore?: number,
  warmthDiff?: number,
  bodyTypeMatch?: number
): string[] {
  const reasons: string[] = [];

  if (vibeScore.vibeMatchScore >= 95) reasons.push('Vibe 일치');
  else if (vibeScore.vibeMatchScore >= 70) reasons.push('Vibe 유사');
  if (vibeScore.colorTier === 'primary') reasons.push('팔레트 Primary');
  else if (vibeScore.colorTier === 'secondary') reasons.push('팔레트 Secondary');

  if (bodyTypeMatch !== undefined && bodyTypeMatch > 0) reasons.push('체형 매칭');
  else if (bodyTypeMatch !== undefined && bodyTypeMatch < 0) reasons.push('체형 미매칭');

  if (colorHarmonyAvg >= 85) reasons.push('컬러 조화 우수');
  else if (colorHarmonyAvg >= 75) reasons.push('컬러 조화 양호');

  if (vibeItemAffinity >= 0.8) reasons.push('스타일 정확 매칭');
  else if (vibeItemAffinity >= 0.5) reasons.push('스타일 유사');

  if (vibeScore.materialScore >= 85) reasons.push('소재 적합');

  if (vibeScore.seasonScore !== undefined) {
    if (vibeScore.seasonScore >= 90) reasons.push('시즌 적합');
    else if (vibeScore.seasonScore < 30) reasons.push('시즌 부적합');
  } else if (seasonMatch >= 1) {
    reasons.push('시즌 적합');
  }

  if (vibeScore.warmthScore !== undefined) {
    if (vibeScore.warmthScore >= 85) reasons.push('보온도 최적');
    else if (vibeScore.warmthScore >= 55) reasons.push('보온도 보통');
    else if (vibeScore.warmthScore < 30) reasons.push('보온도 부적합');
  } else if (warmthDiff !== undefined) {
    if (warmthDiff <= 0.5) reasons.push('보온도 최적');
    else if (warmthDiff <= 1.5) reasons.push('보온도 보통');
    else reasons.push('보온도 부적합');
  }

  if (imageCoherenceScore !== undefined) {
    if (imageCoherenceScore >= 90) reasons.push('비주얼 코히런스 ★');
    else if (imageCoherenceScore >= 80) reasons.push('비주얼 조화 우수');
    else if (imageCoherenceScore < 55) reasons.push('비주얼 이질감');
  }

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
  maxUnregistered: number = 3,
  targetWarmth?: number
): SlotRecommendations {
  const category = SLOT_TO_CATEGORY[slotType] || slotType;
  const existingColorFamilies = getFilledColorFamilies(linkedItems);
  const weightedColorFamilies = getWeightedColorFamilies(linkedItems);
  const linkedProductIds = new Set(linkedItems.map(item => item.product_id));

  const adjacentSeasons: Record<string, string[]> = {
    spring: ['fall'], summer: ['spring'], fall: ['spring', 'winter'], winter: ['fall'],
  };

  const candidates = allProducts.filter(p => {
    if (linkedProductIds.has(p.id)) return false;
    if (p.gender !== outfitGender && p.gender !== 'UNISEX') return false;
    if (p.category !== category) return false;

    if (outfitSeason && p.season?.length) {
      if (!p.season.includes(outfitSeason)) {
        if (!p.season.some(s => (adjacentSeasons[outfitSeason] || []).includes(s))) return false;
      }
    }

    if (outfitSeason && typeof p.warmth === 'number') {
      const limits = ITEM_WARMTH_LIMITS[outfitSeason]?.[category];
      if (limits && (p.warmth < limits.min - 0.5 || p.warmth > limits.max + 0.5)) return false;
    }

    if (targetWarmth !== undefined && typeof p.warmth === 'number') {
      const diff = Math.abs(p.warmth - targetWarmth);
      if (diff > 2.0) return false;
    }

    return true;
  });

  const slotVibeCtx: VibeScoreContext = {
    season: outfitSeason,
    slotType,
    targetWarmth,
  };

  const existingItemsMap: Record<string, Product> = {};
  linkedItems.forEach(li => {
    if (li.product) existingItemsMap[li.slot_type] = li.product;
  });

  const scored: RegisteredRecommendation[] = candidates.map(product => {
    const vibeScore = scoreProductForVibe(product, outfitVibe, slotVibeCtx);
    const colorHarmonyAvg = computeColorHarmonyWithExisting(product, existingColorFamilies, weightedColorFamilies);
    const bodyTypeMatch = computeBodyTypeMatch(product, outfitBodyType);
    const vibeItemAffinity = getVibeItemAffinity(product, outfitVibe);

    const hypotheticalItems = { ...existingItemsMap, [slotType]: product };
    const imageCoherence = computeImageFeatureScore(hypotheticalItems);
    const imageCoherenceBonus = (imageCoherence - 70) * 0.08;

    const warmthDiff = targetWarmth !== undefined && typeof product.warmth === 'number'
      ? Math.abs(product.warmth - targetWarmth)
      : undefined;
    const warmthBonus = warmthDiff !== undefined
      ? warmthDiff <= 0.5 ? 8 : warmthDiff <= 1.0 ? 4 : warmthDiff <= 1.5 ? 0 : -8
      : 0;

    const seasonFallback = vibeScore.seasonScore === undefined
      ? computeSeasonMatch(product, outfitSeason) * 12
      : 0;

    const bodyTypeBonus = bodyTypeMatch * 8;
    const vibeAffinityBonus = vibeItemAffinity >= 0.8 ? 12 : vibeItemAffinity >= 0.5 ? 7 : vibeItemAffinity >= 0.3 ? 2 : -3;

    const score = Math.round(
      vibeScore.total * 0.38 +
      colorHarmonyAvg * 0.27 +
      bodyTypeBonus +
      vibeAffinityBonus +
      seasonFallback +
      imageCoherenceBonus +
      warmthBonus
    );

    const reasons = buildReasons(vibeScore, colorHarmonyAvg, vibeScore.seasonScore === undefined ? computeSeasonMatch(product, outfitSeason) : 1, vibeItemAffinity, imageCoherence, warmthDiff, bodyTypeMatch);

    return { product, score, vibeScore, colorHarmonyAvg, reasons };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.vibeScore.total !== a.vibeScore.total) return b.vibeScore.total - a.vibeScore.total;
    return b.colorHarmonyAvg - a.colorHarmonyAvg;
  });
  const registered = scored.slice(0, maxRegistered);

  const unregistered = getUnregisteredRecommendations(
    slotType,
    outfitVibe,
    allProducts,
    linkedItems,
    existingColorFamilies,
    maxUnregistered,
    outfitGender
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
  maxCount: number,
  outfitGender?: string
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
  const genderFilter = outfitGender || linkedItems.find(i => i.product)?.product?.gender;
  const registeredProductTerms = allProducts
    .filter(p => p.category === registeredCategory && (!genderFilter || p.gender === genderFilter || p.gender === 'UNISEX'))
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

    const colorKeywords = buildColorKeywords(lookDna.color_palette, existingColorFamilies, slotCategory);
    const materialKeywords = buildMaterialKeywords(lookMats, dna.material_preferences, slotCategory, linkedItems, item.name, vk);
    const fitKeywords = buildFitKeywords(item.name, lookDna.silhouette_preference);
    const textureHint = buildTextureHint(dna.material_preferences, linkedItems, item.name);
    const formalityHint = { level: formality, label: getFormalityLabel(formality) };
    const searchKeyword = buildSearchKeyword(item.name, colorKeywords, materialKeywords, fitKeywords, formalityHint);

    return {
      itemName: item.name,
      slotType,
      suggestedColors,
      suggestedMaterials,
      suggestedSilhouettes: silhouettes,
      formalityHint,
      tonalHint,
      colorHarmonyNote: computeColorHarmonyNote(suggestedColors, existingColorFamilies),
      lookName: item.lookName,
      vibeAffinity: Math.round(item.affinity * 100) / 100,
      colorKeywords,
      materialKeywords,
      fitKeywords,
      textureHint,
      searchKeyword,
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

const SILHOUETTE_KOREAN: Record<string, string> = {
  oversized: '오버사이즈',
  fitted: '피티드',
  regular: '레귤러',
  flared: '플레어',
  layered: '레이어드',
};

const DNA_SILHOUETTE_TO_LABEL: Record<string, string> = {
  I: '슬림/스트레이트',
  V: '오버사이즈/와이드',
  X: '아워글래스',
  A: '플레어/와이드레그',
  Y: '탑헤비',
  O: '볼드/라운드',
};

const TEXTURE_GROUP_LABEL: Record<string, string> = {
  smooth: '매끄러운 소재',
  structured: '구조감 있는 소재',
  matte: '무광 매트 소재',
  soft: '부드러운 소재',
  textured: '텍스처 소재',
  sheer: '시스루 소재',
  puffy: '볼륨감 있는 소재',
};

function buildColorKeywords(
  palette: { primary: string[]; secondary: string[]; accent: string[] },
  existingColors: string[],
  slotCategory: SlotCategory
): ColorKeyword[] {
  const isCore = ['top', 'bottom', 'outer'].includes(slotCategory);
  const result: ColorKeyword[] = [];
  const seen = new Set<string>();

  const addColor = (color: string, tier: 'primary' | 'secondary' | 'accent') => {
    if (seen.has(color)) return;
    seen.add(color);
    const scores = existingColors.length > 0
      ? existingColors.map(ec => getColorHarmonyScore(color, ec))
      : [75];
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    let label = '';
    if (avg >= 90) label = '최상 조화';
    else if (avg >= 80) label = '우수 조화';
    else if (avg >= 70) label = '양호 조화';
    else if (avg >= 55) label = '보통';
    else label = '대비 강조';
    result.push({ color, tier, harmonyScore: Math.round(avg), harmonyLabel: label });
  };

  for (const c of palette.primary) addColor(c, 'primary');
  for (const c of palette.secondary) addColor(c, 'secondary');
  if (!isCore) {
    for (const c of palette.accent) addColor(c, 'accent');
  }

  result.sort((a, b) => b.harmonyScore - a.harmonyScore);
  return result.slice(0, 5);
}

const SLOT_MATERIAL_AFFINITY: Record<string, string[]> = {
  outer:     ['wool', 'leather', 'cashmere', 'tweed', 'suede', 'nylon', 'cotton', 'down', 'shearling', 'corduroy'],
  mid:       ['wool', 'cashmere', 'knit', 'cotton', 'fleece', 'merino', 'ribbed', 'cable-knit', 'mohair'],
  top:       ['cotton', 'silk', 'linen', 'cashmere', 'jersey', 'satin', 'chiffon', 'poplin', 'chambray'],
  bottom:    ['denim', 'cotton', 'wool', 'leather', 'linen', 'corduroy', 'satin', 'velvet', 'tweed'],
  shoes:     ['leather', 'suede', 'canvas', 'rubber', 'nylon', 'mesh'],
  bag:       ['leather', 'canvas', 'nylon', 'suede', 'woven', 'straw'],
  accessory: ['metal', 'leather', 'silk', 'gold', 'silver', 'pearl', 'ceramic', 'resin', 'stone', 'wood'],
};

const VIBE_MATERIAL_MAP: Record<string, Record<string, string[]>> = {
  elevated_cool: {
    outer:     ['fine wool', 'leather', 'cashmere', 'gabardine'],
    mid:       ['cashmere', 'fine wool', 'ribbed cotton'],
    top:       ['silk', 'poplin', 'cotton', 'satin'],
    bottom:    ['gabardine', 'wool', 'leather', 'denim'],
    shoes:     ['leather', 'suede'],
    bag:       ['leather', 'suede'],
    accessory: ['silver', 'metal', 'leather', 'silk'],
  },
  effortless_natural: {
    outer:     ['linen', 'cotton', 'canvas', 'waxed cotton'],
    mid:       ['cashmere', 'wool', 'cotton knit'],
    top:       ['linen', 'cotton', 'gauze', 'raw silk'],
    bottom:    ['linen', 'cotton', 'denim', 'canvas'],
    shoes:     ['leather', 'canvas', 'suede'],
    bag:       ['canvas', 'leather', 'woven'],
    accessory: ['wood', 'ceramic', 'leather', 'cotton'],
  },
  artistic_minimal: {
    outer:     ['wool', 'neoprene', 'cotton', 'leather'],
    mid:       ['wool', 'cotton', 'ribbed knit'],
    top:       ['cotton', 'silk', 'linen', 'jersey'],
    bottom:    ['wool', 'cotton', 'leather', 'denim'],
    shoes:     ['leather', 'canvas', 'rubber'],
    bag:       ['leather', 'canvas', 'nylon'],
    accessory: ['metal', 'stone', 'leather', 'resin'],
  },
  retro_luxe: {
    outer:     ['tweed', 'wool', 'cashmere', 'leather', 'suede'],
    mid:       ['cashmere', 'wool', 'mohair', 'boucle'],
    top:       ['silk', 'velvet', 'satin', 'cotton'],
    bottom:    ['velvet', 'corduroy', 'wool', 'suede'],
    shoes:     ['leather', 'suede', 'velvet'],
    bag:       ['leather', 'suede', 'velvet'],
    accessory: ['gold', 'pearl', 'silk', 'leather'],
  },
  sport_modern: {
    outer:     ['nylon', 'gore-tex', 'fleece', 'mesh'],
    mid:       ['fleece', 'cotton', 'jersey', 'merino'],
    top:       ['cotton', 'jersey', 'mesh', 'nylon'],
    bottom:    ['nylon', 'cotton', 'jersey', 'spandex'],
    shoes:     ['rubber', 'mesh', 'nylon', 'leather'],
    bag:       ['nylon', 'canvas', 'mesh'],
    accessory: ['rubber', 'nylon', 'metal', 'silicone'],
  },
  creative_layered: {
    outer:     ['denim', 'leather', 'flannel', 'velvet'],
    mid:       ['cotton', 'knit', 'fleece', 'jersey'],
    top:       ['cotton', 'jersey', 'silk', 'lace'],
    bottom:    ['denim', 'velvet', 'corduroy', 'leather'],
    shoes:     ['leather', 'canvas', 'rubber'],
    bag:       ['leather', 'canvas', 'woven'],
    accessory: ['metal', 'leather', 'resin', 'chain'],
  },
};

function buildMaterialKeywords(
  lookMaterials: string[],
  vibeMaterialPrefs: string[],
  slotCategory: SlotCategory,
  existingItems: OutfitItem[],
  itemName: string,
  vibeKey?: string,
): MaterialKeyword[] {
  const result: MaterialKeyword[] = [];
  const seen = new Set<string>();

  const existingGroups = existingItems
    .filter(i => i.product)
    .map(i => inferMaterialGroup(i.product!.material || '', i.product!.name));

  const slotFit = SLOT_MATERIAL_AFFINITY[slotCategory] || [];

  const addMaterial = (mat: string, reason: MaterialKeyword['reason']) => {
    const lower = mat.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(lower)) return;
    if (lower.match(/[가-힣]/)) return;
    seen.add(lower);
    const group = inferMaterialGroup(lower, itemName);
    let compatScore = 80;
    if (existingGroups.length > 0) {
      const scores = existingGroups.map(eg => getMaterialCompatScore(group, eg) * 100);
      compatScore = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    }
    result.push({ material: lower, group, compatScore, reason });
  };

  // 1순위: 아이템명에서 소재 직접 추출
  const itemLower = itemName.toLowerCase();
  const matKw = ['leather', 'suede', 'wool', 'cotton', 'silk', 'linen', 'denim', 'knit',
    'nylon', 'velvet', 'cashmere', 'canvas', 'corduroy', 'tweed', 'satin', 'mesh',
    'fleece', 'jersey', 'rubber', 'waxed', 'quilted', 'silver', 'gold', 'metal',
    'ceramic', 'pearl', 'wood', 'stone', 'resin', 'chain'];
  for (const kw of matKw) {
    if (itemLower.includes(kw)) addMaterial(kw, 'slot_fit');
  }

  // 2순위: vibe×slot 특화 소재 (generate-amazon-keywords의 VIBE_LOOKS 방식과 동일)
  const vibeSlotMats = (vibeKey && VIBE_MATERIAL_MAP[vibeKey]?.[slotCategory]) || [];
  for (const mat of vibeSlotMats) {
    if (slotFit.some(sf => mat.toLowerCase().includes(sf))) {
      addMaterial(mat, 'slot_fit');
    } else {
      addMaterial(mat, 'vibe_preferred');
    }
  }

  // 3순위: Look 소재 중 슬롯 affinity 있는 것만
  for (const lm of lookMaterials) {
    const lmLower = lm.toLowerCase();
    if (slotFit.some(sf => lmLower.includes(sf) || lmLower === sf)) {
      addMaterial(lm, 'slot_fit');
    }
  }

  // 4순위: vibe material_preferences 그룹 소재 — 슬롯과 맞는 것만
  for (const prefGroup of vibeMaterialPrefs) {
    const groupMats = MATERIAL_GROUPS[prefGroup] || [];
    for (const mat of groupMats) {
      const matLower = mat.toLowerCase();
      if (!matLower.match(/[가-힣]/) && slotFit.some(sf => matLower.includes(sf) || matLower === sf)) {
        addMaterial(mat, 'vibe_preferred');
      }
    }
  }

  // 5순위: 기존 아이템과의 텍스처 대비
  if (existingGroups.length > 0) {
    const dominantGroup = existingGroups[0];
    const contrastedGroups: Record<string, string[]> = {
      structured: ['knit', 'classic'],
      luxe: ['casual', 'classic'],
      classic: ['structured', 'luxe'],
      casual: ['structured', 'luxe'],
      knit: ['structured', 'classic'],
      technical: ['classic', 'luxe'],
    };
    for (const target of (contrastedGroups[dominantGroup] || [])) {
      const mats = MATERIAL_GROUPS[target] || [];
      for (const m of mats) {
        const mLower = m.toLowerCase();
        if (!mLower.match(/[가-힣]/) && slotFit.some(sf => mLower.includes(sf) || mLower === sf)) {
          addMaterial(m, 'texture_contrast');
          break;
        }
      }
    }
  }

  // slot_fit → vibe_preferred → harmony_with_existing → texture_contrast 순 정렬
  result.sort((a, b) => {
    const priorityOrder: MaterialKeyword['reason'][] = ['slot_fit', 'vibe_preferred', 'harmony_with_existing', 'texture_contrast'];
    const ap = priorityOrder.indexOf(a.reason);
    const bp = priorityOrder.indexOf(b.reason);
    if (ap !== bp) return ap - bp;
    return b.compatScore - a.compatScore;
  });

  return result.slice(0, 6);
}

function buildFitKeywords(
  itemName: string,
  dnaSilhouettes: string[]
): FitKeyword[] {
  const inferredSilhouettes = inferSilhouettesFromName(itemName);
  const result: FitKeyword[] = [];

  for (const sil of inferredSilhouettes) {
    const dnaMatch = (sil === 'oversized' && dnaSilhouettes.includes('V')) ||
      (sil === 'fitted' && (dnaSilhouettes.includes('I') || dnaSilhouettes.includes('X'))) ||
      (sil === 'flared' && dnaSilhouettes.includes('A')) ||
      sil === 'regular';
    result.push({ silhouette: sil, label: SILHOUETTE_KOREAN[sil] || sil, dnaMatch });
  }

  for (const dnaSil of dnaSilhouettes.slice(0, 2)) {
    const label = DNA_SILHOUETTE_TO_LABEL[dnaSil] || dnaSil;
    const alreadyHas = result.some(r => {
      if (dnaSil === 'V' && r.silhouette === 'oversized') return true;
      if ((dnaSil === 'I' || dnaSil === 'X') && r.silhouette === 'fitted') return true;
      if (dnaSil === 'A' && r.silhouette === 'flared') return true;
      return false;
    });
    if (!alreadyHas) {
      result.push({ silhouette: dnaSil, label, dnaMatch: true });
    }
  }

  return result.slice(0, 3);
}

function buildTextureHint(
  vibePreferredMaterials: string[],
  existingItems: OutfitItem[],
  itemName: string
): string {
  const existingGroups = existingItems
    .filter(i => i.product)
    .map(i => inferMaterialGroup(i.product!.material || '', i.product!.name));

  if (existingGroups.length === 0) {
    const prefGroup = vibePreferredMaterials[0] || 'classic';
    const TEXTURE_GROUP_LABEL_MAP: Record<string, string> = {
      luxe: 'smooth', structured: 'structured', classic: 'matte',
      casual: 'soft', knit: 'textured', technical: 'smooth',
    };
    const tl = TEXTURE_GROUP_LABEL_MAP[prefGroup] || 'matte';
    return TEXTURE_GROUP_LABEL[tl] || tl;
  }

  const dominantGroup = existingGroups[0];
  const CONTRAST_SUGGESTION: Record<string, string> = {
    structured: 'soft', luxe: 'matte', casual: 'structured',
    knit: 'smooth', classic: 'textured', technical: 'matte',
  };
  const suggested = CONTRAST_SUGGESTION[dominantGroup] || 'matte';
  return TEXTURE_GROUP_LABEL[suggested] || suggested;
}

function buildSearchKeyword(
  itemName: string,
  colorKeywords: ColorKeyword[],
  materialKeywords: MaterialKeyword[],
  fitKeywords: FitKeyword[],
  formalityHint: { level: number; label: string }
): string {
  const parts: string[] = [itemName];

  const topColor = colorKeywords.find(c => c.tier === 'primary' && c.harmonyScore >= 75);
  if (topColor) parts.push(topColor.color);

  // slot_fit 소재를 우선, 없으면 vibe_preferred 사용
  const topMat = materialKeywords.find(m => m.reason === 'slot_fit')
    ?? materialKeywords.find(m => m.reason === 'vibe_preferred');
  if (topMat) parts.push(topMat.material);

  const topFit = fitKeywords.find(f => f.dnaMatch);
  if (topFit && topFit.silhouette !== 'regular') parts.push(topFit.silhouette);

  if (formalityHint.level >= 6) parts.push('formal');
  else if (formalityHint.level <= 2) parts.push('casual');

  return parts.slice(0, 4).join(' ');
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
  outfitSeason?: string,
  targetWarmth?: number
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
        outfitSeason,
        5,
        3,
        targetWarmth
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
