import { supabase } from './supabase';
import { Outfit, OutfitItem } from '../data/outfits';

interface RankingOutfit extends Outfit {
  likeCount: number;
}

const fetchOutfitItems = async (outfitIds: string[]): Promise<Map<string, OutfitItem[]>> => {
  const { data, error } = await supabase
    .from('outfit_items')
    .select(`
      id,
      outfit_id,
      product_id,
      slot_type,
      created_at,
      products (
        id,
        brand,
        name,
        category,
        gender,
        body_type,
        vibe,
        color,
        season,
        silhouette,
        image_url,
        product_link,
        price,
        stock_status,
        created_at,
        updated_at
      )
    `)
    .in('outfit_id', outfitIds);

  if (error) throw error;

  const itemsMap = new Map<string, OutfitItem[]>();

  data?.forEach((item: any) => {
    const outfitItem: OutfitItem = {
      id: item.id,
      outfit_id: item.outfit_id,
      product_id: item.product_id,
      slot_type: item.slot_type,
      created_at: item.created_at,
      product: item.products ? {
        id: item.products.id,
        brand: item.products.brand || '',
        name: item.products.name,
        category: item.products.category,
        gender: item.products.gender,
        body_type: item.products.body_type || [],
        vibe: item.products.vibe || [],
        color: item.products.color || '',
        season: item.products.season || [],
        silhouette: item.products.silhouette || '',
        image_url: item.products.image_url,
        product_link: item.products.product_link || '',
        price: item.products.price,
        stock_status: item.products.stock_status || 'in_stock',
        created_at: item.products.created_at,
        updated_at: item.products.updated_at,
      } : undefined,
    };

    if (!itemsMap.has(item.outfit_id)) {
      itemsMap.set(item.outfit_id, []);
    }
    itemsMap.get(item.outfit_id)!.push(outfitItem);
  });

  return itemsMap;
};

export const fetchOutfits = async (): Promise<Outfit[]> => {
  try {
    const { data, error } = await supabase
      .from('outfits')
      .select('*')
      .eq('status', 'DONE_FLAT')
      .not('image_url_flatlay', 'is', null)
      .neq('image_url_flatlay', '');

    if (error) throw error;

    if (data && data.length > 0) {
      console.log(`Loaded ${data.length} outfits from Supabase`);

      const outfitIds = data.map(o => o.id);
      const itemsMap = await fetchOutfitItems(outfitIds);

      return data.map(row => ({
        id: row.id,
        gender: row.gender,
        body_type: row.body_type,
        vibe: row.vibe,
        image_url_flatlay: row.image_url_flatlay || '',
        image_url_on_model: row.image_url_on_model || '',
        insight_text: row['AI insight'] || '',
        flatlay_pins: row.flatlay_pins || [],
        on_model_pins: row.on_model_pins || [],
        tpo: row.tpo || '',
        status: row.status || '',
        prompt_flatlay: row.prompt_flatlay || '',
        created_at: row.created_at || '',
        updated_at: row.updated_at || '',
        items: itemsMap.get(row.id) || [],
      }));
    }

    return [];
  } catch (error) {
    console.error('Error fetching outfits:', error);
    return [];
  }
};

export const fetchRankingOutfits = async (gender: 'MALE' | 'FEMALE'): Promise<Outfit[]> => {
  try {
    const { data: outfitsData, error: outfitsError } = await supabase
      .from('outfits')
      .select('*')
      .eq('gender', gender);

    if (outfitsError) throw outfitsError;
    if (!outfitsData || outfitsData.length === 0) {
      return [];
    }

    const outfitIds = outfitsData.map(o => o.id);

    const { data: feedbackData, error: feedbackError } = await supabase
      .from('outfit_feedback')
      .select('outfit_id, feedback_type')
      .in('outfit_id', outfitIds);

    if (feedbackError) throw feedbackError;

    const likeCounts: { [key: string]: number } = {};
    feedbackData?.forEach(f => {
      if (f.feedback_type === 'like') {
        likeCounts[f.outfit_id] = (likeCounts[f.outfit_id] || 0) + 1;
      }
    });

    const itemsMap = await fetchOutfitItems(outfitIds);

    const outfitsWithLikes: RankingOutfit[] = outfitsData.map(row => ({
      id: row.id,
      gender: row.gender,
      body_type: row.body_type,
      vibe: row.vibe,
      image_url_flatlay: row.image_url_flatlay || '',
      image_url_on_model: row.image_url_on_model || '',
      insight_text: row['AI insight'] || '',
      flatlay_pins: row.flatlay_pins || [],
      on_model_pins: row.on_model_pins || [],
      tpo: row.tpo || '',
      status: row.status || '',
      prompt_flatlay: row.prompt_flatlay || '',
      created_at: row.created_at || '',
      updated_at: row.updated_at || '',
      items: itemsMap.get(row.id) || [],
      likeCount: likeCounts[row.id] || 0
    }));

    const sorted = outfitsWithLikes.sort((a, b) => b.likeCount - a.likeCount);

    return sorted.filter(o => o.likeCount > 0).slice(0, 10);
  } catch (error) {
    console.error('Error fetching ranking outfits:', error);
    return [];
  }
};
