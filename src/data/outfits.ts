export interface Outfit {
  id: string;
  where: string;
  style: string;
  pick_rank: number;
  image_url: string;
  image_url_flatlay?: string;
  image_url_on_model?: string;
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
