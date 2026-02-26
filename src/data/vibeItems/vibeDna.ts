import { VibeKey, VibeDNA, LookKey } from './types';
import { ELEVATED_COOL } from './elevatedCool';
import { EFFORTLESS_NATURAL } from './effortlessNatural';
import { ARTISTIC_MINIMAL } from './artisticMinimal';
import { RETRO_LUXE } from './retroLuxe';
import { SPORT_MODERN } from './sportModern';
import { CREATIVE_LAYERED } from './creativeLayered';

const VIBE_MAP = {
  ELEVATED_COOL,
  EFFORTLESS_NATURAL,
  ARTISTIC_MINIMAL,
  RETRO_LUXE,
  SPORT_MODERN,
  CREATIVE_LAYERED,
} as const;

export function getVibeDNA(vibe: VibeKey): VibeDNA {
  return VIBE_MAP[vibe].dna;
}

export function getLookDNA(vibe: VibeKey, look: LookKey): VibeDNA {
  const baseDna = VIBE_MAP[vibe].dna;
  const overrides = VIBE_MAP[vibe].looks[look].dna_overrides;
  if (!overrides) return baseDna;
  return {
    ...baseDna,
    ...overrides,
    texture_rules: overrides.texture_rules
      ? { ...baseDna.texture_rules, ...overrides.texture_rules }
      : baseDna.texture_rules,
    color_palette: overrides.color_palette
      ? { ...baseDna.color_palette, ...overrides.color_palette }
      : baseDna.color_palette,
  };
}

const VIBE_DISTANCES: Record<VibeKey, Record<VibeKey, number>> = {
  ELEVATED_COOL: {
    ELEVATED_COOL: 0, ARTISTIC_MINIMAL: 1, EFFORTLESS_NATURAL: 2,
    RETRO_LUXE: 2, CREATIVE_LAYERED: 2, SPORT_MODERN: 3,
  },
  EFFORTLESS_NATURAL: {
    EFFORTLESS_NATURAL: 0, ARTISTIC_MINIMAL: 1, ELEVATED_COOL: 2,
    CREATIVE_LAYERED: 2, RETRO_LUXE: 3, SPORT_MODERN: 2,
  },
  ARTISTIC_MINIMAL: {
    ARTISTIC_MINIMAL: 0, ELEVATED_COOL: 1, EFFORTLESS_NATURAL: 1,
    CREATIVE_LAYERED: 2, RETRO_LUXE: 2, SPORT_MODERN: 3,
  },
  RETRO_LUXE: {
    RETRO_LUXE: 0, CREATIVE_LAYERED: 1, ELEVATED_COOL: 2,
    ARTISTIC_MINIMAL: 2, EFFORTLESS_NATURAL: 3, SPORT_MODERN: 3,
  },
  SPORT_MODERN: {
    SPORT_MODERN: 0, EFFORTLESS_NATURAL: 2, CREATIVE_LAYERED: 2,
    ELEVATED_COOL: 3, ARTISTIC_MINIMAL: 3, RETRO_LUXE: 3,
  },
  CREATIVE_LAYERED: {
    CREATIVE_LAYERED: 0, RETRO_LUXE: 1, ARTISTIC_MINIMAL: 2,
    ELEVATED_COOL: 2, EFFORTLESS_NATURAL: 2, SPORT_MODERN: 2,
  },
};

export function getVibeDistance(v1: string, v2: string): number {
  const k1 = v1 as VibeKey;
  const k2 = v2 as VibeKey;
  return VIBE_DISTANCES[k1]?.[k2] ?? VIBE_DISTANCES[k2]?.[k1] ?? 3;
}

export function getVibeCompatScore(v1: string, v2: string): number {
  const distance = getVibeDistance(v1, v2);
  return [100, 85, 65, 40, 20][Math.min(distance, 4)];
}

export function getVibeColorPalette(vibe: VibeKey): { primary: string[]; secondary: string[]; accent: string[] } {
  return VIBE_MAP[vibe].dna.color_palette;
}

export function getVibeFormalityRange(vibe: VibeKey): [number, number] {
  return VIBE_MAP[vibe].dna.formality_range;
}

export function getVibeMaterialPreferences(vibe: VibeKey): string[] {
  return VIBE_MAP[vibe].dna.material_preferences;
}
