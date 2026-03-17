export interface ImagePin {
  x: number;
  y: number;
  item: 'outer' | 'mid' | 'top' | 'bottom' | 'shoes' | 'bag' | 'accessory' | 'accessory_2';
  url?: string;
  product_id?: string;
}

export interface Product {
  id: string;
  brand: string;
  name: string;
  category: 'outer' | 'mid' | 'top' | 'bottom' | 'shoes' | 'bag' | 'accessory';
  gender: string;
  body_type: string[];
  vibe: string[];
  color: string;
  season: string[];
  silhouette: string;
  image_url: string;
  product_link: string;
  affiliate_link?: string;
  price: number | null;
  stock_status: 'in_stock' | 'out_of_stock' | 'coming_soon';
  material?: string;
  color_family?: string;
  color_tone?: string;
  sub_category?: string;
  pattern?: string;
  formality?: number;
  warmth?: number;
  nobg_image_url?: string;
  vibe_scores?: Record<string, number>;
  look_affinity?: Record<string, Record<string, number>>;
  image_features?: {
    dominantColors: string[];
    texture: string;
    visualWeight: string;
    styleAttributes: string[];
    patternDetail: string;
    brightnessLevel: string;
  };
  created_at: string;
  updated_at: string;
}

export interface OutfitItem {
  id: string;
  outfit_id: string;
  product_id: string;
  slot_type: 'outer' | 'mid' | 'top' | 'bottom' | 'shoes' | 'bag' | 'accessory' | 'accessory_2';
  created_at: string;
  product?: Product;
}

export interface Outfit {
  id: string;
  gender: string;
  body_type: string;
  vibe: string;
  season?: string[];
  image_url_flatlay: string;
  image_url_flatlay_clean?: string;
  image_url_on_model: string;
  insight_text: string;
  flatlay_pins?: ImagePin[];
  on_model_pins?: ImagePin[];
  tpo?: string;
  status?: string;
  prompt_flatlay?: string;
  target_warmth?: number;
  target_season?: string;
  created_at?: string;
  updated_at?: string;
  items?: OutfitItem[];
}

export interface RenderJob {
  id: string;
  outfit_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  render_type: 'flatlay' | 'on_model';
  result_image_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export const outfits: Outfit[] = [];
