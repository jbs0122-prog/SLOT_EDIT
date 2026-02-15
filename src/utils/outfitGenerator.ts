import { supabase } from './supabase';
import { Product } from '../data/outfits';
import { findBestOutfits, OutfitCandidate } from './matchingEngine';
import { removeBackground } from './backgroundRemoval';

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

export const MAX_OUTFIT_USAGE = 5;

export async function generateOutfitsAutomatically(
  params: GenerateOutfitsParams
): Promise<GeneratedOutfit[]> {
  const { gender, bodyType, vibe, count = 5, targetWarmth, targetSeason } = params;

  const [productsResult, usageResult] = await Promise.all([
    supabase.from('products').select('*'),
    supabase.from('outfit_items').select('product_id'),
  ]);

  if (productsResult.error) throw productsResult.error;
  if (!productsResult.data || productsResult.data.length === 0) {
    throw new Error('제품이 없습니다. 먼저 제품을 추가해주세요.');
  }

  const usageCounts: Record<string, number> = {};
  usageResult.data?.forEach(item => {
    if (item.product_id) {
      usageCounts[item.product_id] = (usageCounts[item.product_id] || 0) + 1;
    }
  });

  const products = productsResult.data.filter(
    p => (usageCounts[p.id] || 0) < MAX_OUTFIT_USAGE
  );

  if (products.length === 0) {
    throw new Error('사용 가능한 제품이 없습니다. 모든 제품이 코디 사용 한도(5회)에 도달했습니다.');
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
    color_family: p.color_family || '',
    color_tone: p.color_tone || '',
    sub_category: p.sub_category || '',
    pattern: p.pattern || '',
    formality: typeof p.formality === 'number' ? p.formality : undefined,
    warmth: typeof p.warmth === 'number' ? p.warmth : undefined,
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
    if (outfit.mid) {
      items.push({ slot_type: 'mid', product_id: outfit.mid.id });
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
    if (outfit.accessory_2) {
      items.push({ slot_type: 'accessory_2', product_id: outfit.accessory_2.id });
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

  await Promise.all([
    processBackgroundRemoval(bestOutfits, productList),
    generateInsightsForOutfits(bestOutfits, generatedOutfits, productList, { gender, bodyType, vibe, targetSeason }),
  ]);

  return generatedOutfits;
}

async function processBackgroundRemoval(
  outfits: Array<{ outfit: OutfitCandidate }>,
  products: Product[]
): Promise<void> {
  const productMap = new Map(products.map(p => [p.id, p]));
  const uniqueProductIds = new Set<string>();

  for (const { outfit } of outfits) {
    const items = [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory, outfit.accessory_2];
    for (const item of items) {
      if (item) uniqueProductIds.add(item.id);
    }
  }

  const productsToProcess: Product[] = [];
  for (const id of uniqueProductIds) {
    const product = productMap.get(id);
    if (product && product.image_url) {
      const { data } = await supabase
        .from('products')
        .select('nobg_image_url')
        .eq('id', id)
        .maybeSingle();

      if (!data?.nobg_image_url) {
        productsToProcess.push(product);
      }
    }
  }

  const BATCH_SIZE = 3;
  for (let i = 0; i < productsToProcess.length; i += BATCH_SIZE) {
    const batch = productsToProcess.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(product =>
        removeBackground(product.image_url, product.id).catch(err => {
          console.error(`BG removal failed for product ${product.id}:`, err);
        })
      )
    );
  }
}

async function generateInsightsForOutfits(
  bestOutfits: Array<{ outfit: OutfitCandidate; matchScore: { score: number } }>,
  generatedOutfits: GeneratedOutfit[],
  products: Product[],
  context: { gender: string; bodyType: string; vibe: string; targetSeason?: string }
): Promise<void> {
  const productMap = new Map(products.map(p => [p.id, p]));
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-outfit-insight`;
  const headers = {
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  await Promise.allSettled(
    bestOutfits.map(async ({ outfit, matchScore }, index) => {
      const outfitId = generatedOutfits[index]?.outfitId;
      if (!outfitId) return;

      const slots: Array<{ key: keyof OutfitCandidate; label: string }> = [
        { key: 'outer', label: 'outer' },
        { key: 'mid', label: 'mid' },
        { key: 'top', label: 'top' },
        { key: 'bottom', label: 'bottom' },
        { key: 'shoes', label: 'shoes' },
        { key: 'bag', label: 'bag' },
        { key: 'accessory', label: 'accessory' },
        { key: 'accessory_2', label: 'accessory_2' },
      ];

      const items = slots
        .filter(s => outfit[s.key])
        .map(s => {
          const p = outfit[s.key] as Product;
          return {
            slot_type: s.label,
            brand: p.brand || '',
            name: p.name,
            category: p.category,
            color: p.color || '',
            color_family: p.color_family || '',
            material: p.material || '',
            pattern: p.pattern || '',
            silhouette: p.silhouette || '',
            sub_category: p.sub_category || '',
            vibe: p.vibe || [],
            price: p.price,
          };
        });

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            items,
            gender: context.gender,
            bodyType: context.bodyType,
            vibe: context.vibe,
            matchScore: matchScore.score,
            season: context.targetSeason,
          }),
        });

        if (!response.ok) return;

        const data = await response.json();
        if (!data.success || !data.insight) return;

        await supabase
          .from('outfits')
          .update({ 'AI insight': data.insight })
          .eq('id', outfitId);
      } catch (err) {
        console.error(`Insight generation failed for outfit ${outfitId}:`, err);
      }
    })
  );
}
