import { Product } from '../data/outfits';
import {
  resolveColorFamily,
  getColorHarmonyScore as _getColorHarmonyScore,
  isNeutralColor as _isNeutralColor,
  isEarthTone as _isEarthTone,
} from './matching/colorDna';
import {
  inferMaterialGroup as _inferMaterialGroup,
  getMaterialCompatScore as _getMaterialCompatScore,
  MATERIAL_GROUPS as _MATERIAL_GROUPS,
  MATERIAL_COMPAT as _MATERIAL_COMPAT,
} from './matching/itemDna';
import { getVibeDistance, getVibeCompatScore as _getVibeCompatScore } from '../data/vibeItems/vibeDna';
import { STYLE_COMPAT as _STYLE_COMPAT, SUB_CATEGORY_STYLE as _SUB_CATEGORY_STYLE, inferStyle } from './matching/rules/formalityCoherenceRule';
import { SEASON_WARMTH } from './matching/beamSearch';

export type ColorType = 'neutral' | 'earth' | 'accent' | 'special';

export interface ColorProfile {
  type: ColorType;
  warmth: 'warm' | 'cool' | 'neutral';
  lightness: 'light' | 'medium' | 'dark';
}

export const COLOR_PROFILES: Record<string, ColorProfile> = {
  black: { type: 'neutral', warmth: 'neutral', lightness: 'dark' },
  white: { type: 'neutral', warmth: 'neutral', lightness: 'light' },
  grey: { type: 'neutral', warmth: 'cool', lightness: 'medium' },
  charcoal: { type: 'neutral', warmth: 'cool', lightness: 'dark' },
  navy: { type: 'neutral', warmth: 'cool', lightness: 'dark' },
  beige: { type: 'neutral', warmth: 'warm', lightness: 'light' },
  cream: { type: 'neutral', warmth: 'warm', lightness: 'light' },
  ivory: { type: 'neutral', warmth: 'warm', lightness: 'light' },
  denim: { type: 'neutral', warmth: 'cool', lightness: 'medium' },
  brown: { type: 'earth', warmth: 'warm', lightness: 'dark' },
  tan: { type: 'earth', warmth: 'warm', lightness: 'medium' },
  camel: { type: 'earth', warmth: 'warm', lightness: 'medium' },
  olive: { type: 'earth', warmth: 'warm', lightness: 'medium' },
  khaki: { type: 'earth', warmth: 'warm', lightness: 'medium' },
  sage: { type: 'earth', warmth: 'cool', lightness: 'medium' },
  rust: { type: 'earth', warmth: 'warm', lightness: 'medium' },
  mustard: { type: 'earth', warmth: 'warm', lightness: 'medium' },
  burgundy: { type: 'earth', warmth: 'warm', lightness: 'dark' },
  wine: { type: 'earth', warmth: 'warm', lightness: 'dark' },
  red: { type: 'accent', warmth: 'warm', lightness: 'medium' },
  blue: { type: 'accent', warmth: 'cool', lightness: 'medium' },
  green: { type: 'accent', warmth: 'cool', lightness: 'medium' },
  yellow: { type: 'accent', warmth: 'warm', lightness: 'light' },
  orange: { type: 'accent', warmth: 'warm', lightness: 'medium' },
  pink: { type: 'accent', warmth: 'warm', lightness: 'light' },
  purple: { type: 'accent', warmth: 'cool', lightness: 'medium' },
  coral: { type: 'accent', warmth: 'warm', lightness: 'medium' },
  teal: { type: 'accent', warmth: 'cool', lightness: 'medium' },
  mint: { type: 'accent', warmth: 'cool', lightness: 'light' },
  sky_blue: { type: 'accent', warmth: 'cool', lightness: 'light' },
  lavender: { type: 'accent', warmth: 'cool', lightness: 'light' },
  metallic: { type: 'special', warmth: 'neutral', lightness: 'medium' },
  multi: { type: 'special', warmth: 'neutral', lightness: 'medium' },
};

export function getColorHarmonyScore(c1: string, c2: string): number {
  return _getColorHarmonyScore(c1, c2);
}

export function isNeutralColor(color: string): boolean {
  return _isNeutralColor(color);
}

export function isEarthTone(color: string): boolean {
  return _isEarthTone(color);
}

export const MATERIAL_GROUPS = _MATERIAL_GROUPS;
export const MATERIAL_COMPAT = _MATERIAL_COMPAT;

export function getMaterialGroup(material: string): string | null {
  if (!material) return null;
  const result = _inferMaterialGroup(material);
  return result === 'blend' ? null : result;
}

export function getMaterialCompatScore(g1: string, g2: string): number {
  return _getMaterialCompatScore(g1, g2);
}

const PATTERN_COMPAT: Record<string, Record<string, number>> = {
  solid:   { solid: 85, stripe: 90, check: 88, graphic: 80, print: 78, floral: 82, other: 75 },
  stripe:  { solid: 90, stripe: 30, check: 25, graphic: 35, print: 40, floral: 35, other: 45 },
  check:   { solid: 88, stripe: 25, check: 25, graphic: 35, print: 38, floral: 30, other: 40 },
  graphic: { solid: 80, stripe: 35, check: 35, graphic: 30, print: 35, floral: 30, other: 40 },
  print:   { solid: 78, stripe: 40, check: 38, graphic: 35, print: 28, floral: 30, other: 40 },
  floral:  { solid: 82, stripe: 35, check: 30, graphic: 30, print: 30, floral: 25, other: 35 },
  other:   { solid: 75, stripe: 45, check: 40, graphic: 40, print: 40, floral: 35, other: 50 },
};

export function getPatternCompatScore(p1: string, p2: string): number {
  const s1 = p1.toLowerCase();
  const s2 = p2.toLowerCase();
  return PATTERN_COMPAT[s1]?.[s2] ?? PATTERN_COMPAT[s2]?.[s1] ?? 50;
}

export { getVibeDistance };

export function getVibeCompatScore(v1: string, v2: string): number {
  return _getVibeCompatScore(v1, v2);
}

export const SUB_CATEGORY_STYLE = _SUB_CATEGORY_STYLE;
export const STYLE_COMPAT = _STYLE_COMPAT;

export const SILHOUETTE_BALANCE: Record<string, string[]> = {
  oversized: ['slim', 'fitted', 'straight', 'tapered'],
  relaxed: ['slim', 'fitted', 'straight', 'tapered'],
  wide: ['fitted', 'slim'],
  fitted: ['wide', 'relaxed', 'oversized', 'straight'],
  slim: ['wide', 'relaxed', 'oversized', 'regular'],
  regular: ['slim', 'fitted', 'wide', 'relaxed', 'oversized'],
  straight: ['fitted', 'slim', 'oversized', 'relaxed'],
  tapered: ['relaxed', 'oversized', 'regular', 'wide'],
};

export const BODY_TYPE_SILHOUETTE_PREFS: Record<string, Record<string, string[]>> = {
  slim: {
    top: ['regular', 'relaxed', 'oversized'],
    mid: ['regular', 'relaxed'],
    outer: ['regular', 'relaxed', 'oversized'],
    bottom: ['wide', 'straight', 'relaxed'],
  },
  regular: {
    top: ['regular', 'fitted', 'relaxed'],
    mid: ['regular', 'fitted'],
    outer: ['regular', 'relaxed'],
    bottom: ['wide', 'straight', 'tapered'],
  },
  'plus-size': {
    top: ['regular', 'relaxed'],
    mid: ['regular', 'relaxed'],
    outer: ['regular', 'relaxed'],
    bottom: ['wide', 'straight', 'relaxed'],
  },
  athletic: {
    top: ['fitted', 'regular'],
    mid: ['fitted', 'regular'],
    outer: ['regular', 'fitted'],
    bottom: ['wide', 'straight', 'tapered'],
  },
};

export function getBodyTypeSilhouetteScore(bodyType: string, category: string, silhouette: string): number {
  const prefs = BODY_TYPE_SILHOUETTE_PREFS[bodyType]?.[category];
  if (!prefs || !silhouette) return 0;
  const idx = prefs.indexOf(silhouette);
  if (idx === -1) return -10;
  if (idx === 0) return 20;
  if (idx === 1) return 12;
  return 5;
}

export function getSubCategoryPairingBonus(sub1: string, sub2: string): number {
  if (!sub1 || !sub2) return 0;
  const k1 = sub1.toLowerCase().replace(/[\s-]/g, '_');
  const k2 = sub2.toLowerCase().replace(/[\s-]/g, '_');
  return SUB_CAT_PAIRING_SCORES[makePairingKey(k1, k2)] ?? 0;
}

function makePairingKey(s1: string, s2: string): string {
  return [s1, s2].sort().join('+');
}

const SUB_CAT_PAIRING_SCORES: Record<string, number> = {};
function sp(s1: string, s2: string, score: number) {
  SUB_CAT_PAIRING_SCORES[makePairingKey(s1, s2)] = score;
}

sp('blazer', 'slacks', 25); sp('blazer', 'shirt', 20); sp('blazer', 'chinos', 18);
sp('blazer', 'derby', 20); sp('blazer', 'loafer', 22); sp('blazer', 'turtleneck', 15);
sp('blazer', 'denim', 10); sp('blazer', 'sneaker', -5);
sp('coat', 'sweater', 18); sp('coat', 'slacks', 15); sp('coat', 'shirt', 12);
sp('coat', 'boot', 18); sp('coat', 'derby', 15); sp('coat', 'turtleneck', 15);
sp('jacket', 'tshirt', 18); sp('jacket', 'denim', 20); sp('jacket', 'sneaker', 15);
sp('jacket', 'chinos', 12); sp('jacket', 'cargo', 15); sp('jacket', 'hoodie', 10);
sp('trench', 'slacks', 20); sp('trench', 'shirt', 18); sp('trench', 'loafer', 18);
sp('trench', 'derby', 15); sp('trench', 'turtleneck', 15);
sp('puffer', 'hoodie', 15); sp('puffer', 'sneaker', 18); sp('puffer', 'denim', 15);
sp('puffer', 'cargo', 12); sp('puffer', 'sweatshirt', 12);
sp('shirt', 'slacks', 20); sp('shirt', 'chinos', 18); sp('shirt', 'denim', 15);
sp('shirt', 'loafer', 18); sp('shirt', 'derby', 20);
sp('tshirt', 'denim', 20); sp('tshirt', 'cargo', 18); sp('tshirt', 'sneaker', 20);
sp('tshirt', 'shorts', 15); sp('tshirt', 'chinos', 10);
sp('polo', 'chinos', 22); sp('polo', 'slacks', 12); sp('polo', 'denim', 15);
sp('polo', 'loafer', 15); sp('polo', 'sneaker', 12);
sp('sweater', 'slacks', 15); sp('sweater', 'chinos', 18); sp('sweater', 'denim', 15);
sp('sweater', 'loafer', 15); sp('sweater', 'derby', 12); sp('sweater', 'boot', 12);
sp('cardigan', 'shirt', 20); sp('cardigan', 'tshirt', 12); sp('cardigan', 'slacks', 15);
sp('cardigan', 'denim', 15); sp('cardigan', 'chinos', 18);
sp('hoodie', 'denim', 18); sp('hoodie', 'cargo', 18); sp('hoodie', 'sneaker', 22);
sp('hoodie', 'jogger', 15); sp('hoodie', 'slacks', -10);
sp('turtleneck', 'slacks', 18); sp('turtleneck', 'coat', 15); sp('turtleneck', 'loafer', 15);
sp('turtleneck', 'denim', 12);
sp('denim', 'sneaker', 18); sp('denim', 'loafer', 12); sp('denim', 'boot', 15);
sp('slacks', 'derby', 20); sp('slacks', 'loafer', 22); sp('slacks', 'sneaker', -5);
sp('chinos', 'loafer', 18); sp('chinos', 'sneaker', 12); sp('chinos', 'derby', 15);
sp('cargo', 'sneaker', 20); sp('cargo', 'boot', 15);
sp('necktie', 'blazer', 25); sp('necktie', 'shirt', 22); sp('necktie', 'slacks', 15);
sp('watch', 'blazer', 10); sp('watch', 'shirt', 10);
sp('cap', 'hoodie', 15); sp('cap', 'tshirt', 12); sp('cap', 'sneaker', 10);
sp('belt', 'slacks', 10); sp('belt', 'chinos', 10); sp('belt', 'denim', 8);
sp('tote', 'shirt', 10); sp('tote', 'slacks', 8);
sp('backpack', 'hoodie', 12); sp('backpack', 'tshirt', 10); sp('backpack', 'sneaker', 10);
sp('crossbody', 'jacket', 10); sp('crossbody', 'denim', 8);

export const SEASON_WARMTH_TARGETS: Record<string, { min: number; max: number; ideal: number }> = SEASON_WARMTH;

export function inferColorFamily(product: Product): string {
  return resolveColorFamily(product.color || '', product.color_family);
}

export function inferMaterialGroup(product: Product): string | null {
  return _inferMaterialGroup(product.material || '', product.name) || null;
}

export function inferSubCategoryStyle(product: Product): string | null {
  return inferStyle(product);
}
