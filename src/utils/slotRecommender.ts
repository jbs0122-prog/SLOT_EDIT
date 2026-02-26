import { Product, OutfitItem } from '../data/outfits';
import { VIBE_ITEM_DATABASE, VibeKey, SlotCategory } from '../data/vibeItemDatabase';
import { getVibeDNA } from '../data/vibeItems/vibeDna';
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
    if (p.gender !== outfitGender) return false;
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
  const lookItemMap = new Map<string, string>();

  for (const [lookKey, lookDef] of Object.entries(vibeDef.looks)) {
    const slotItems = lookDef.slots[slotCategory];
    if (!slotItems) continue;
    for (const itemName of slotItems) {
      const normalized = itemName.toLowerCase();
      if (!allItemNames.has(normalized)) {
        allItemNames.add(normalized);
        lookItemMap.set(normalized, lookDef.name);
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

  const unmatched: Array<{ name: string; lookName: string; affinity: number }> = [];

  for (const [normalized, lookName] of lookItemMap.entries()) {
    const isRegistered = registeredProductTerms.some(term => {
      const words = normalized.split(/\s+/);
      return words.some(w => w.length >= 4 && term.includes(w));
    });

    if (!isRegistered) {
      const affinity = 0.5 + Math.random() * 0.3;
      unmatched.push({ name: normalized, lookName, affinity });
    }
  }

  unmatched.sort((a, b) => b.affinity - a.affinity);

  const suggestedColors = getSuggestedColors(dna.color_palette, existingColorFamilies);
  const lookMaterials = new Map<string, string[]>();
  for (const [, lookDef] of Object.entries(vibeDef.looks)) {
    lookMaterials.set(lookDef.name, lookDef.materials.slice(0, 4));
  }

  return unmatched.slice(0, maxCount).map(item => ({
    itemName: item.name,
    slotType,
    suggestedColors,
    suggestedMaterials: lookMaterials.get(item.lookName) || dna.material_preferences.slice(0, 3),
    lookName: item.lookName,
    vibeAffinity: item.affinity,
  }));
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
