import { supabase } from './supabase';
import { Outfit, OutfitItem } from '../data/outfits';

interface RankingOutfit extends Outfit {
  likeCount: number;
}

const CHUNK_SIZE = 50;

const buildOutfitItem = (item: any): OutfitItem => ({
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
    affiliate_link: item.products.affiliate_link || '',
    price: item.products.price,
    stock_status: item.products.stock_status || 'in_stock',
    material: item.products.material || '',
    color_family: item.products.color_family || '',
    color_tone: item.products.color_tone || '',
    sub_category: item.products.sub_category || '',
    pattern: item.products.pattern || '',
    formality: typeof item.products.formality === 'number' ? item.products.formality : undefined,
    warmth: typeof item.products.warmth === 'number' ? item.products.warmth : undefined,
    nobg_image_url: item.products.nobg_image_url || '',
    created_at: item.products.created_at,
    updated_at: item.products.updated_at,
  } : undefined,
});

const fetchOutfitItemsChunk = async (chunkIds: string[]): Promise<any[]> => {
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
        affiliate_link,
        price,
        stock_status,
        material,
        color_family,
        color_tone,
        sub_category,
        pattern,
        formality,
        warmth,
        nobg_image_url,
        created_at,
        updated_at
      )
    `)
    .in('outfit_id', chunkIds);

  if (error) throw error;
  return data || [];
};

const fetchOutfitItems = async (outfitIds: string[]): Promise<Map<string, OutfitItem[]>> => {
  const chunks: string[][] = [];
  for (let i = 0; i < outfitIds.length; i += CHUNK_SIZE) {
    chunks.push(outfitIds.slice(i, i + CHUNK_SIZE));
  }

  const results = await Promise.all(chunks.map(fetchOutfitItemsChunk));
  const allItems = results.flat();

  const itemsMap = new Map<string, OutfitItem[]>();
  allItems.forEach((item: any) => {
    const outfitItem = buildOutfitItem(item);
    if (!itemsMap.has(item.outfit_id)) {
      itemsMap.set(item.outfit_id, []);
    }
    itemsMap.get(item.outfit_id)!.push(outfitItem);
  });

  return itemsMap;
};

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Query timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
};

const mapOutfitRow = (row: any, itemsMap?: Map<string, OutfitItem[]>): Outfit => ({
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
  items: itemsMap ? (itemsMap.get(row.id) || []) : [],
});

export const fetchOutfitsMetaOnly = async (): Promise<Outfit[]> => {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('outfits')
        .select('id, gender, body_type, vibe, image_url_flatlay, image_url_on_model, "AI insight", flatlay_pins, on_model_pins, tpo, status, prompt_flatlay, created_at, updated_at')
        .in('status', ['DONE_FLAT', 'completed'])
        .not('image_url_flatlay', 'is', null)
        .neq('image_url_flatlay', ''),
      10000
    );

    if (error) throw error;

    if (data && data.length > 0) {
      console.log(`Loaded ${data.length} outfit metas from Supabase`);
      return data.map((row: any) => mapOutfitRow(row));
    }

    return [];
  } catch (error) {
    console.error('Error fetching outfit metas:', error);
    return [];
  }
};

export const fetchOutfitItemsForIds = async (outfitIds: string[]): Promise<Map<string, OutfitItem[]>> => {
  return withTimeout(fetchOutfitItems(outfitIds), 20000);
};

export const fetchOutfits = async (): Promise<Outfit[]> => {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('outfits')
        .select('*')
        .in('status', ['DONE_FLAT', 'completed'])
        .not('image_url_flatlay', 'is', null)
        .neq('image_url_flatlay', ''),
      15000
    );

    if (error) throw error;

    if (data && data.length > 0) {
      console.log(`Loaded ${data.length} outfits from Supabase`);

      const outfitIds = data.map((o: any) => o.id);
      const itemsMap = await withTimeout(fetchOutfitItems(outfitIds), 20000);

      return data.map((row: any) => mapOutfitRow(row, itemsMap));
    }

    return [];
  } catch (error) {
    console.error('Error fetching outfits:', error);
    return [];
  }
};

export const fetchOutfitById = async (outfitId: string): Promise<Outfit | null> => {
  try {
    const { data, error } = await supabase
      .from('outfits')
      .select('*')
      .eq('id', outfitId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const itemsMap = await fetchOutfitItems([data.id]);

    return {
      id: data.id,
      gender: data.gender,
      body_type: data.body_type,
      vibe: data.vibe,
      image_url_flatlay: data.image_url_flatlay || '',
      image_url_on_model: data.image_url_on_model || '',
      insight_text: data['AI insight'] || '',
      flatlay_pins: data.flatlay_pins || [],
      on_model_pins: data.on_model_pins || [],
      tpo: data.tpo || '',
      status: data.status || '',
      prompt_flatlay: data.prompt_flatlay || '',
      created_at: data.created_at || '',
      updated_at: data.updated_at || '',
      items: itemsMap.get(data.id) || [],
    };
  } catch (error) {
    console.error('Error fetching outfit by id:', error);
    return null;
  }
};

export const generateInsightForOutfit = async (
  outfitId: string,
  flatlayImageUrl?: string
): Promise<string | null> => {
  try {
    const { data: outfit, error: outfitError } = await supabase
      .from('outfits')
      .select('gender, body_type, vibe')
      .eq('id', outfitId)
      .maybeSingle();

    if (outfitError || !outfit) return null;

    const { data: itemsData, error: itemsError } = await supabase
      .from('outfit_items')
      .select(`
        slot_type,
        products (
          brand, name, category, color, color_family,
          material, pattern, silhouette, sub_category, vibe, price
        )
      `)
      .eq('outfit_id', outfitId);

    if (itemsError || !itemsData || itemsData.length === 0) return null;

    const items = itemsData.map((item: any) => ({
      slot_type: item.slot_type,
      brand: item.products?.brand || '',
      name: item.products?.name || '',
      category: item.products?.category || '',
      color: item.products?.color || '',
      color_family: item.products?.color_family || '',
      material: item.products?.material || '',
      pattern: item.products?.pattern || '',
      silhouette: item.products?.silhouette || '',
      sub_category: item.products?.sub_category || '',
      vibe: item.products?.vibe || [],
      price: item.products?.price,
    }));

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-outfit-insight`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items,
        gender: outfit.gender,
        bodyType: outfit.body_type,
        vibe: outfit.vibe,
        matchScore: 80,
        flatlayImageUrl,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.success || !data.insight) return null;

    await supabase
      .from('outfits')
      .update({ 'AI insight': data.insight })
      .eq('id', outfitId);

    return data.insight;
  } catch (err) {
    console.error(`Insight generation failed for outfit ${outfitId}:`, err);
    return null;
  }
};

export const fetchRankingOutfits = async (gender: 'MALE' | 'FEMALE'): Promise<Outfit[]> => {
  try {
    const { data: outfitsData, error: outfitsError } = await supabase
      .from('outfits')
      .select('*')
      .eq('gender', gender)
      .in('status', ['DONE_FLAT', 'completed'])
      .not('image_url_flatlay', 'is', null)
      .neq('image_url_flatlay', '');

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
