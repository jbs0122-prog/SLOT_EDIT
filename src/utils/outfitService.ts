import { supabase } from './supabase';
import { Outfit } from '../data/outfits';

export const fetchOutfits = async (): Promise<Outfit[]> => {
  try {
    const { data, error } = await supabase
      .from('outfits')
      .select('*');

    if (error) throw error;

    if (data && data.length > 0) {
      console.log(`Loaded ${data.length} outfits from Supabase`);
      return data.map(row => ({
        id: row.id,
        gender: row.gender,
        body_type: row.body_type,
        vibe: row.vibe,
        image_url_flatlay1: row.image_url_flatlay1 || '',
        image_url_flatlay2: row.image_url_flatlay2 || '',
        image_url_on_model: row.image_url_on_model || '',
        insight_text: row['AI insight'] || '',
        outer_name: row.outer_name || '',
        outer_image: row.outer_image || '',
        outer_link: row.outer_link || '',
        top_name: row.top_name || '',
        top_image: row.top_image || '',
        top_link: row.top_link || '',
        bottom_name: row.bottom_name || '',
        bottom_image: row.bottom_image || '',
        bottom_link: row.bottom_link || '',
        shoes_name: row.shoes_name || '',
        shoes_image: row.shoes_image || '',
        shoes_link: row.shoes_link || '',
        bag_name: row.bag_name || '',
        bag_image: row.bag_image || '',
        bag_link: row.bag_link || '',
        accessory_name: row.accessory_name || '',
        accessory_image: row.accessory_image || '',
        accessory_link: row.accessory_link || '',
        flatlay1_pins: row.flatlay1_pins || [],
        flatlay2_pins: row.flatlay2_pins || [],
        on_model_pins: row.on_model_pins || [],
      }));
    }

    return [];
  } catch (error) {
    console.error('Error fetching outfits:', error);
    return [];
  }
};
