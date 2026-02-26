import { ELEVATED_COOL } from '../data/vibeItems/elevatedCool';
import { EFFORTLESS_NATURAL } from '../data/vibeItems/effortlessNatural';
import { ARTISTIC_MINIMAL } from '../data/vibeItems/artisticMinimal';
import { RETRO_LUXE } from '../data/vibeItems/retroLuxe';
import { SPORT_MODERN } from '../data/vibeItems/sportModern';
import { CREATIVE_LAYERED } from '../data/vibeItems/creativeLayered';
import type { VibeDefinition, VibeKey } from '../data/vibeItems/types';
import type { Product } from '../data/outfits';

const VIBE_MAP: Record<string, VibeDefinition> = {
  ELEVATED_COOL,
  EFFORTLESS_NATURAL,
  ARTISTIC_MINIMAL,
  RETRO_LUXE,
  SPORT_MODERN,
  CREATIVE_LAYERED,
};

const COLOR_TO_FAMILY: Record<string, string[]> = {
  black: ['black'], charcoal: ['charcoal', 'grey'], navy: ['navy'],
  white: ['white', 'ivory'], grey: ['grey', 'charcoal'], cream: ['cream', 'ivory', 'beige'],
  camel: ['camel', 'tan', 'brown'], beige: ['beige', 'cream', 'tan'],
  ivory: ['ivory', 'cream', 'white'], olive: ['olive', 'sage', 'green'],
  khaki: ['khaki', 'tan', 'beige'], tan: ['tan', 'camel', 'brown'],
  sage: ['sage', 'olive', 'green'], brown: ['brown', 'camel', 'tan'],
  burgundy: ['burgundy', 'wine'], wine: ['wine', 'burgundy'],
  metallic: ['metallic', 'gold', 'silver'], rust: ['rust', 'orange', 'brown'],
  mustard: ['mustard', 'yellow'], teal: ['teal'], gold: ['gold', 'metallic'],
  denim: ['denim', 'blue'], orange: ['orange', 'rust'], red: ['red'],
  purple: ['purple', 'lavender'], pink: ['pink', 'coral'],
  yellow: ['yellow', 'mustard'], green: ['green', 'olive', 'sage'],
  blue: ['blue', 'navy', 'denim'],
};

export type ColorTier = 'primary' | 'secondary' | 'accent' | 'outside';

export interface VibeCompatScore {
  total: number;
  colorScore: number;
  colorTier: ColorTier;
  formalityScore: number;
  vibeMatchScore: number;
  materialScore: number;
}

function getColorTier(colorFamily: string, vibeKey: string): ColorTier {
  const def = VIBE_MAP[vibeKey];
  if (!def) return 'outside';
  const lc = (colorFamily || '').toLowerCase();
  const palette = def.dna.color_palette;
  const matchesTier = (colors: string[]) =>
    colors.some(c => {
      const mapped = COLOR_TO_FAMILY[c] || [c];
      return mapped.includes(lc) || lc === c;
    });
  if (matchesTier(palette.primary)) return 'primary';
  if (matchesTier(palette.secondary)) return 'secondary';
  if (matchesTier(palette.accent)) return 'accent';
  return 'outside';
}

export function scoreProductForVibe(product: Product, vibeKey: string): VibeCompatScore {
  const def = VIBE_MAP[vibeKey];
  if (!def) return { total: 50, colorScore: 50, colorTier: 'outside', formalityScore: 50, vibeMatchScore: 50, materialScore: 50 };

  const colorTier = getColorTier(product.color_family || '', vibeKey);
  const colorScore = colorTier === 'primary' ? 100 : colorTier === 'secondary' ? 75 : colorTier === 'accent' ? 50 : 20;

  const [fMin, fMax] = def.dna.formality_range;
  const scaledMin = Math.ceil(fMin / 2);
  const scaledMax = Math.ceil(fMax / 2);
  const f = product.formality ?? 3;
  let formalityScore = 100;
  if (f < scaledMin) formalityScore = Math.max(0, 100 - (scaledMin - f) * 30);
  else if (f > scaledMax) formalityScore = Math.max(0, 100 - (f - scaledMax) * 30);

  const vibeMatchScore = product.vibe?.includes(vibeKey) ? 100 : 30;

  let materialScore = 50;
  if (product.material) {
    const matLower = product.material.toLowerCase();
    const prefMats = def.dna.material_preferences;
    const matKeywords: Record<string, string[]> = {
      structured: ['wool', 'cotton', 'gabardine', 'poplin', 'neoprene', 'canvas'],
      luxe: ['silk', 'cashmere', 'leather', 'velvet', 'satin'],
      classic: ['cotton', 'wool', 'linen', 'denim'],
      eco: ['linen', 'hemp', 'organic', 'bamboo'],
      knit: ['knit', 'cashmere', 'merino', 'mohair', 'wool'],
      technical: ['nylon', 'polyester', 'gore-tex', 'fleece', 'mesh', 'spandex'],
      casual: ['cotton', 'jersey', 'fleece', 'denim'],
      blend: ['blend', 'poly', 'mixed'],
      sheer: ['mesh', 'chiffon', 'organza', 'lace', 'tulle'],
    };
    const matches = prefMats.filter(pref => {
      const kws = matKeywords[pref] || [];
      return kws.some(kw => matLower.includes(kw));
    });
    materialScore = matches.length > 0 ? 70 + Math.min(30, matches.length * 15) : 40;
  }

  const total = Math.round(
    colorScore * 0.30 + formalityScore * 0.25 + vibeMatchScore * 0.30 + materialScore * 0.15
  );

  return { total, colorScore, colorTier, formalityScore, vibeMatchScore, materialScore };
}

export function sortProductsByVibeCompat(products: Product[], vibeKey: string): (Product & { _vibeScore: VibeCompatScore })[] {
  return products
    .map(p => ({ ...p, _vibeScore: scoreProductForVibe(p, vibeKey) }))
    .sort((a, b) => b._vibeScore.total - a._vibeScore.total);
}

export function getVibeColorPalette(vibeKey: string): { primary: string[]; secondary: string[]; accent: string[] } | null {
  const def = VIBE_MAP[vibeKey];
  if (!def) return null;
  return def.dna.color_palette;
}

export function getVibeFormalityRange(vibeKey: string): [number, number] | null {
  const def = VIBE_MAP[vibeKey];
  if (!def) return null;
  return def.dna.formality_range;
}

export interface OutfitCompleteness {
  filledSlots: string[];
  missingSlots: string[];
  totalItems: number;
  hasCoreItems: boolean;
  colorHarmony: 'excellent' | 'good' | 'fair' | 'poor';
  formalitySpread: number;
  overallScore: number;
}

export function analyzeOutfitCompleteness(
  items: { slot_type: string; product?: Product }[],
  vibeKey: string
): OutfitCompleteness {
  const coreSlots = ['top', 'bottom', 'shoes'];
  const allSlots = ['outer', 'mid', 'top', 'bottom', 'shoes', 'bag', 'accessory', 'accessory_2'];
  const filledSlots = items.map(i => i.slot_type);
  const missingSlots = allSlots.filter(s => !filledSlots.includes(s));
  const hasCoreItems = coreSlots.every(s => filledSlots.includes(s));

  const productsWithData = items.filter(i => i.product).map(i => i.product!);
  const colorTiers = productsWithData.map(p => getColorTier(p.color_family || '', vibeKey));
  const primaryCount = colorTiers.filter(t => t === 'primary').length;
  const outsideCount = colorTiers.filter(t => t === 'outside').length;
  const total = colorTiers.length || 1;

  let colorHarmony: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
  if (outsideCount === 0 && primaryCount / total >= 0.5) colorHarmony = 'excellent';
  else if (outsideCount <= 1 && primaryCount / total >= 0.3) colorHarmony = 'good';
  else if (outsideCount <= 2) colorHarmony = 'fair';

  const formalities = productsWithData.map(p => p.formality ?? 3);
  const formalitySpread = formalities.length > 1
    ? Math.max(...formalities) - Math.min(...formalities)
    : 0;

  let overallScore = 0;
  overallScore += hasCoreItems ? 30 : (filledSlots.filter(s => coreSlots.includes(s)).length / 3) * 30;
  overallScore += colorHarmony === 'excellent' ? 25 : colorHarmony === 'good' ? 18 : colorHarmony === 'fair' ? 10 : 5;
  overallScore += Math.max(0, 20 - formalitySpread * 5);
  overallScore += Math.min(25, (filledSlots.length / 6) * 25);

  return {
    filledSlots,
    missingSlots,
    totalItems: items.length,
    hasCoreItems,
    colorHarmony,
    formalitySpread,
    overallScore: Math.round(overallScore),
  };
}

export const COLOR_TIER_STYLES: Record<ColorTier, string> = {
  primary: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  secondary: 'bg-blue-100 text-blue-700 border-blue-300',
  accent: 'bg-amber-100 text-amber-700 border-amber-300',
  outside: 'bg-red-100 text-red-700 border-red-300',
};

export const COLOR_TIER_LABELS: Record<ColorTier, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  outside: 'Outside',
};
