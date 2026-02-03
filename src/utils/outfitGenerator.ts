import { supabase } from './supabase';
import { Product } from '../data/outfits';
import { findBestOutfits, OutfitCandidate } from './matchingEngine';

export interface GenerateOutfitsParams {
  gender: string;
  bodyType: string;
  vibe: string;
  count?: number;
  targetWarmth?: number;
  targetSeason?: string;
}

export interface GeneratedOutfit {
  outfitId: string;
  items: {
    slot_type: string;
    product_id: string;
  }[];
  matchScore: number;
}

export async function generateOutfitsAutomatically(
  params: GenerateOutfitsParams
): Promise<GeneratedOutfit[]> {
  const { gender, bodyType, vibe, count = 5, targetWarmth, targetSeason } = params;

  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('*');

  if (fetchError) throw fetchError;
  if (!products || products.length === 0) {
    throw new Error('제품이 없습니다. 먼저 제품을 추가해주세요.');
  }

  const productList: Product[] = products.map(p => ({
    id: p.id,
    brand: p.brand,
    name: p.name,
    category: p.category,
    gender: p.gender,
    body_type: p.body_type || [],
    vibe: p.vibe || [],
    color: p.color || '',
    season: p.season || [],
    silhouette: p.silhouette || '',
    image_url: p.image_url,
    product_link: p.product_link || '',
    affiliate_link: p.affiliate_link || '',
    price: p.price,
    stock_status: p.stock_status || 'in_stock',
    material: p.material || '',
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));

  const bestOutfits = findBestOutfits(
    productList,
    {
      gender,
      bodyType,
      vibe,
      targetWarmth,
      targetSeason,
    },
    count
  );

  if (bestOutfits.length === 0) {
    throw new Error('조건에 맞는 코디를 생성할 수 없습니다. 제품을 더 추가해주세요.');
  }

  const generatedOutfits: GeneratedOutfit[] = [];

  for (const { outfit, matchScore } of bestOutfits) {
    const { data: newOutfit, error: outfitError } = await supabase
      .from('outfits')
      .insert([
        {
          gender,
          body_type: bodyType,
          vibe,
          status: 'pending_render',
          tpo: '',
          'AI insight': `매칭 점수: ${matchScore.score}점`,
          image_url_flatlay: '',
          image_url_on_model: '',
          flatlay_pins: [],
          on_model_pins: [],
          prompt_flatlay: '',
        },
      ])
      .select()
      .single();

    if (outfitError) throw outfitError;
    if (!newOutfit) throw new Error('코디 생성 실패');

    const items: { slot_type: string; product_id: string }[] = [];

    if (outfit.outer) {
      items.push({ slot_type: 'outer', product_id: outfit.outer.id });
    }
    if (outfit.top) {
      items.push({ slot_type: 'top', product_id: outfit.top.id });
    }
    if (outfit.bottom) {
      items.push({ slot_type: 'bottom', product_id: outfit.bottom.id });
    }
    if (outfit.shoes) {
      items.push({ slot_type: 'shoes', product_id: outfit.shoes.id });
    }
    if (outfit.bag) {
      items.push({ slot_type: 'bag', product_id: outfit.bag.id });
    }
    if (outfit.accessory) {
      items.push({ slot_type: 'accessory', product_id: outfit.accessory.id });
    }

    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        outfit_id: newOutfit.id,
        product_id: item.product_id,
        slot_type: item.slot_type,
      }));

      const { error: itemsError } = await supabase
        .from('outfit_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    generatedOutfits.push({
      outfitId: newOutfit.id,
      items,
      matchScore: matchScore.score,
    });
  }

  return generatedOutfits;
}
