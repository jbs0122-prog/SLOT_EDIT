export interface Outfit {
  id: string;
  gender: string;
  body_type: string;
  vibe: string;
  image_url_flatlay1: string;
  image_url_flatlay2: string;
  image_url_on_model: string;
  insight_text: string;
  top_name: string;
  top_image: string;
  top_link: string;
  bottom_name: string;
  bottom_image: string;
  bottom_link: string;
  shoes_name: string;
  shoes_image: string;
  shoes_link: string;
}

export const outfits: Outfit[] = [];
