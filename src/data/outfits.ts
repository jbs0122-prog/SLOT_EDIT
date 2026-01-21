export interface ImagePin {
  x: number;
  y: number;
  item: 'outer' | 'top' | 'bottom' | 'shoes' | 'bag' | 'accessory';
}

export interface Outfit {
  id: string;
  gender: string;
  body_type: string;
  vibe: string;
  image_url_flatlay1: string;
  image_url_flatlay2: string;
  image_url_on_model: string;
  insight_text: string;
  outer_name: string;
  outer_image: string;
  outer_link: string;
  top_name: string;
  top_image: string;
  top_link: string;
  bottom_name: string;
  bottom_image: string;
  bottom_link: string;
  shoes_name: string;
  shoes_image: string;
  shoes_link: string;
  bag_name: string;
  bag_image: string;
  bag_link: string;
  accessory_name: string;
  accessory_image: string;
  accessory_link: string;
  flatlay1_pins?: ImagePin[];
  flatlay2_pins?: ImagePin[];
  on_model_pins?: ImagePin[];
}

export const outfits: Outfit[] = [];
