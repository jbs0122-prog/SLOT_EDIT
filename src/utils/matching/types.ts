import { Product } from '../../data/outfits';

export interface ItemDNA {
  formality: number;
  visualWeight: number;
  textureProfile: TextureProfile;
  colorDNA: ColorDNA;
  silhouette: string;
  proportionZone: 'upper' | 'lower' | 'feet' | 'accessory';
  eraMoodTags: string[];
  materialGroup: string;
}

export interface TextureProfile {
  smoothness: number;
  sheenLevel: number;
  structure: number;
  label: string;
}

export interface ColorDNA {
  hue: number;
  saturation: number;
  lightness: number;
  family: string;
  tone: 'warm' | 'cool' | 'neutral';
  type: 'neutral' | 'earth' | 'accent' | 'special';
}

export interface RuleVerdict {
  ruleName: string;
  pass: boolean;
  score: number;
  penalty: number;
  detail?: string;
}

export interface BeamCandidate {
  slots: Partial<Record<string, Product>>;
  filledSlots: string[];
  cumulativeScore: number;
  ruleVerdicts: RuleVerdict[];
}

export interface CompositionScore {
  total: number;
  breakdown: {
    proportion: number;
    tonalHarmony: number;
    textureContrast: number;
    formalityCoherence: number;
    vibeAffinity: number;
    colorDepth: number;
    materialCompat: number;
    contextFit: number;
  };
}

export interface DnaLabRules {
  color_palette?: { dominant_colors?: string[]; primary_strategy?: string };
  material_combo?: { primary_materials?: string[] };
  silhouette?: { preferred?: string[] };
  formality?: { average?: number; range?: [number, number] };
}

export interface AssemblyContext {
  vibe?: string;
  look?: string;
  gender?: string;
  bodyType?: string;
  targetSeason?: string;
  targetWarmth?: number;
  dnaRules?: DnaLabRules | null;
}

export type SlotName = 'outer' | 'mid' | 'top' | 'bottom' | 'shoes' | 'bag' | 'accessory' | 'accessory_2';

export const SLOT_ORDER: SlotName[] = ['top', 'bottom', 'shoes', 'outer', 'mid', 'bag', 'accessory', 'accessory_2'];
export const CORE_SLOTS: SlotName[] = ['top', 'bottom', 'shoes'];
export const OPTIONAL_SLOTS: SlotName[] = ['outer', 'mid', 'bag', 'accessory', 'accessory_2'];
