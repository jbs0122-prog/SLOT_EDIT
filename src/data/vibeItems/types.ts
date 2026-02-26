export type VibeKey =
  | 'ELEVATED_COOL'
  | 'EFFORTLESS_NATURAL'
  | 'ARTISTIC_MINIMAL'
  | 'RETRO_LUXE'
  | 'SPORT_MODERN'
  | 'CREATIVE_LAYERED';

export type LookKey = 'A' | 'B' | 'C';

export type SlotCategory = 'outer' | 'top' | 'bottom' | 'shoes' | 'bag' | 'accessory';

export type TonalStrategy = 'tone-on-tone' | 'tone-in-tone' | 'contrast';

export type SilhouetteTarget = 'I' | 'A' | 'V' | 'Y' | 'X' | 'H';

export type ProportionStyle = 'balanced' | 'top-heavy' | 'bottom-heavy' | 'column' | 'relaxed';

export interface VibeDNA {
  formality_range: [number, number];
  preferred_tonal_strategy: TonalStrategy[];
  silhouette_preference: SilhouetteTarget[];
  texture_rules: {
    required_variety: number;
    preferred_textures: string[];
    forbidden_textures?: string[];
    sheen_tolerance: number;
  };
  color_palette: {
    primary: string[];
    secondary: string[];
    accent: string[];
    max_accent_ratio: number;
  };
  proportion_style: ProportionStyle;
  mixing_tolerance: number;
  material_preferences: string[];
  era_mood_tags: string[];
}

export interface VibeLookDefinition {
  name: string;
  slots: Record<SlotCategory, string[]>;
  materials: string[];
  dna_overrides?: Partial<VibeDNA>;
}

export interface VibeDefinition {
  keywords: string[];
  props: string[];
  dna: VibeDNA;
  looks: Record<LookKey, VibeLookDefinition>;
}
