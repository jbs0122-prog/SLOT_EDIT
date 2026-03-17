export interface StyleDnaCell {
  id: string;
  gender: string;
  body_type: string;
  vibe: string;
  look_key: string;
  season: string;
  status: 'empty' | 'in_progress' | 'ready';
  reference_count: number;
  style_brief: string;
  learned_palette: Record<string, unknown>;
  learned_materials: string[];
  learned_silhouettes: string[];
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface StyleDnaReference {
  id: string;
  cell_id: string;
  image_url: string;
  source: 'upload' | 'pinterest' | 'url';
  notes: string;
  ai_analysis: AiAnalysis | null;
  extracted_items: ExtractedItem[] | null;
  sort_order: number;
  created_at: string;
}

export interface AiAnalysis {
  colors: string[];
  color_strategy: string;
  materials: string[];
  silhouettes: string[];
  formality: number;
  mood: string[];
  items: {
    slot: string;
    description: string;
    color: string;
    material: string;
  }[];
  overall_impression: string;
}

export interface ExtractedItem {
  slot: string;
  name: string;
  color: string;
  material: string;
  keywords: string[];
}

export interface StyleDnaLearnedRule {
  id: string;
  cell_id: string;
  rule_type: 'color_palette' | 'material_combo' | 'silhouette' | 'formality' | 'proportion' | 'keyword';
  rule_data: Record<string, unknown>;
  confidence: number;
  source_reference_ids: string[];
  created_at: string;
}

export type CellFilter = {
  gender: string | null;
  bodyType: string | null;
  vibe: string | null;
  season: string | null;
  status: string | null;
};

export const GENDERS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
];

export const BODY_TYPES = [
  { value: 'slim', label: 'Slim' },
  { value: 'regular', label: 'Regular' },
  { value: 'plus-size', label: 'Plus' },
];

export const VIBES = [
  { value: 'ELEVATED_COOL', label: 'Elevated Cool', desc: 'Sharp, minimal, city-noir' },
  { value: 'EFFORTLESS_NATURAL', label: 'Effortless Natural', desc: 'Organic, relaxed, soft texture' },
  { value: 'ARTISTIC_MINIMAL', label: 'Artistic Minimal', desc: 'Clean, gallery, muted palette' },
  { value: 'RETRO_LUXE', label: 'Retro Luxe', desc: 'Vintage-inspired, rich fabric' },
  { value: 'SPORT_MODERN', label: 'Sport Modern', desc: 'Athletic, technical, clean' },
  { value: 'CREATIVE_LAYERED', label: 'Creative Layered', desc: 'Bold layers, mixed textures' },
];

export const SEASONS = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall' },
  { value: 'winter', label: 'Winter' },
];

export const LOOK_KEYS = ['A', 'B', 'C'] as const;

export const LOOK_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  A: { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30', dot: 'bg-sky-400' },
  B: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  C: { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30', dot: 'bg-rose-400' },
};

export const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  empty: { bg: 'bg-white/5', text: 'text-white/40', label: 'Empty' },
  in_progress: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'In Progress' },
  ready: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Ready' },
};
