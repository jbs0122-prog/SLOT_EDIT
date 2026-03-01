import { supabase } from './supabase';
import { Product, OutfitItem } from '../data/outfits';
import { findBestOutfits, OutfitCandidate, AnchorItem, MatchScore } from './matchingEngine';
import { removeBackground } from './backgroundRemoval';
import { getSlotRecommendations } from './slotRecommender';
import { ITEM_WARMTH_LIMITS } from './matching/beamSearch';

export interface GenerateOutfitsParams {
  gender: string;
  bodyType: string;
  vibe: string;
  count?: number;
  targetWarmth?: number;
  targetSeason?: string;
  anchorProductId?: string;
  anchorSlot?: string;
  unusedOnly?: boolean;
}

export interface GeneratedOutfit {
  outfitId: string;
  items: {
    slot_type: string;
    product_id: string;
  }[];
  matchScore: number;
  autoFilledSlots?: string[];
}

export const MAX_OUTFIT_USAGE = 3;

export async function generateOutfitsAutomatically(
  params: GenerateOutfitsParams
): Promise<GeneratedOutfit[]> {
  const { gender, bodyType, vibe, count = 5, targetWarmth, targetSeason, anchorProductId, anchorSlot, unusedOnly = false } = params;

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

  const products = productsResult.data.filter(p => {
    if (p.id === anchorProductId) return true;
    if (unusedOnly) return (usageCounts[p.id] || 0) === 0;
    return (usageCounts[p.id] || 0) < MAX_OUTFIT_USAGE;
  });

  if (products.length === 0) {
    if (unusedOnly) {
      throw new Error('미사용 제품이 없습니다. 모든 제품이 이미 코디에 사용되었습니다.');
    }
    throw new Error('사용 가능한 제품이 없습니다. 모든 제품이 코디 사용 한도(3회)에 도달했습니다.');
  }

  const mapProduct = (p: typeof products[number]): Product => ({
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
    image_features: p.image_features || undefined,
    created_at: p.created_at,
    updated_at: p.updated_at,
  });

  const productList: Product[] = products.map(mapProduct);

  let anchor: AnchorItem | undefined;
  if (anchorProductId && anchorSlot) {
    const anchorProduct = productList.find(p => p.id === anchorProductId);
    if (anchorProduct) {
      anchor = {
        product: anchorProduct,
        slotType: anchorSlot as keyof import('./matchingEngine').OutfitCandidate,
      };
    }
  }

  const aiCandidateCount = Math.min(count * 5, 50);
  const ruleBased = await findBestOutfits(
    productList,
    {
      gender,
      bodyType,
      vibe,
      targetWarmth,
      targetSeason,
    },
    aiCandidateCount,
    anchor,
    usageCounts
  );

  if (ruleBased.length === 0) {
    throw new Error('조건에 맞는 코디를 생성할 수 없습니다. 제품을 더 추가해주세요.');
  }

  const bestOutfits = await refineWithAI(ruleBased, count, { gender, bodyType, vibe, targetSeason, targetWarmth }, unusedOnly);

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

    const autoFilledSlots = await fillEmptySlots(
      newOutfit.id,
      items,
      productList,
      { gender, bodyType, vibe, targetSeason }
    );

    generatedOutfits.push({
      outfitId: newOutfit.id,
      items,
      matchScore: matchScore.score,
      autoFilledSlots,
    });
  }

  processBackgroundRemoval(bestOutfits, productList).catch(err =>
    console.error('Background removal failed:', err)
  );
  generateInsightsForOutfits(bestOutfits, generatedOutfits, productList, { gender, bodyType, vibe, targetSeason }).catch(err =>
    console.error('Insight generation failed:', err)
  );
  triggerImageFeatureAnalysis(productList).catch(err =>
    console.error('Image feature analysis failed:', err)
  );

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

const OPTIONAL_SLOT_FILL_ORDER = ['bag', 'accessory', 'outer', 'mid', 'accessory_2'];

const SEASON_EXCLUDED_SLOTS: Record<string, string[]> = {
  summer: ['outer', 'mid'],
  spring: ['mid'],
};

async function fillEmptySlots(
  outfitId: string,
  existingItems: { slot_type: string; product_id: string }[],
  allProducts: Product[],
  context: { gender: string; bodyType: string; vibe: string; targetSeason?: string }
): Promise<string[]> {
  const filledSlotTypes = new Set(existingItems.map(i => i.slot_type));
  const seasonExcluded = new Set(context.targetSeason ? (SEASON_EXCLUDED_SLOTS[context.targetSeason] || []) : []);

  const emptyOptionalSlots = OPTIONAL_SLOT_FILL_ORDER.filter(slot =>
    !filledSlotTypes.has(slot) && !seasonExcluded.has(slot)
  );

  if (emptyOptionalSlots.length === 0) return [];

  const usedProductIds = new Set(existingItems.map(i => i.product_id));

  const linkedItems: OutfitItem[] = existingItems.map(item => {
    const product = allProducts.find(p => p.id === item.product_id);
    return {
      id: item.product_id,
      outfit_id: outfitId,
      product_id: item.product_id,
      slot_type: item.slot_type,
      product,
    } as OutfitItem;
  });

  const newItems: { outfit_id: string; product_id: string; slot_type: string }[] = [];
  const filledSlots: string[] = [];

  for (const slot of emptyOptionalSlots) {
    const slotWarmthLimits = context.targetSeason
      ? ITEM_WARMTH_LIMITS[context.targetSeason]?.[slot]
      : undefined;

    const availableProducts = allProducts.filter(p => {
      if (usedProductIds.has(p.id)) return false;
      if (slotWarmthLimits && typeof p.warmth === 'number') {
        if (p.warmth < slotWarmthLimits.min - 0.5 || p.warmth > slotWarmthLimits.max + 0.5) return false;
      }
      return true;
    });

    const recs = getSlotRecommendations(
      slot,
      availableProducts,
      linkedItems,
      context.vibe,
      context.gender,
      context.bodyType,
      context.targetSeason,
      1,
      0
    );

    const top = recs.registered[0];
    if (!top || top.score < 50) continue;

    newItems.push({ outfit_id: outfitId, product_id: top.product.id, slot_type: slot });
    usedProductIds.add(top.product.id);
    linkedItems.push({
      id: top.product.id,
      outfit_id: outfitId,
      product_id: top.product.id,
      slot_type: slot,
      product: top.product,
    } as OutfitItem);
    filledSlots.push(slot);
  }

  if (newItems.length > 0) {
    const { error } = await supabase.from('outfit_items').insert(newItems);
    if (error) {
      console.error('Auto-fill slot insertion failed:', error);
      return [];
    }
  }

  return filledSlots;
}

function getOutfitProductIds(outfit: OutfitCandidate): string[] {
  return [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory, outfit.accessory_2]
    .filter((p): p is Product => !!p)
    .map(p => p.id);
}

function canAddWithoutDuplicates(
  existing: Array<{ outfit: OutfitCandidate; matchScore: MatchScore }>,
  candidate: { outfit: OutfitCandidate; matchScore: MatchScore }
): boolean {
  const usedProducts = new Map<string, number>();
  for (const { outfit } of existing) {
    for (const id of getOutfitProductIds(outfit)) {
      usedProducts.set(id, (usedProducts.get(id) || 0) + 1);
    }
  }
  const candidateIds = getOutfitProductIds(candidate.outfit);
  return !candidateIds.some(id => (usedProducts.get(id) || 0) >= 1);
}

function deduplicateOutfits(
  candidates: Array<{ outfit: OutfitCandidate; matchScore: MatchScore }>,
  maxCount: number,
  strict = false
): Array<{ outfit: OutfitCandidate; matchScore: MatchScore }> {
  const result: Array<{ outfit: OutfitCandidate; matchScore: MatchScore }> = [];
  const usedProducts = new Set<string>();

  for (const candidate of candidates) {
    if (result.length >= maxCount) break;
    const ids = getOutfitProductIds(candidate.outfit);
    const hasDuplicate = ids.some(id => usedProducts.has(id));

    if (!hasDuplicate) {
      result.push(candidate);
      ids.forEach(id => usedProducts.add(id));
    }
  }

  if (!strict && result.length < maxCount) {
    for (const candidate of candidates) {
      if (result.length >= maxCount) break;
      if (!result.includes(candidate)) {
        result.push(candidate);
      }
    }
  }

  return result;
}

async function refineWithAI(
  ruleBased: Array<{ outfit: OutfitCandidate; matchScore: MatchScore }>,
  finalCount: number,
  context: { gender: string; bodyType: string; vibe: string; targetSeason?: string; targetWarmth?: number },
  strictDedup = false
): Promise<Array<{ outfit: OutfitCandidate; matchScore: MatchScore }>> {
  if (ruleBased.length <= finalCount) {
    return strictDedup ? deduplicateOutfits(ruleBased, finalCount, true) : ruleBased;
  }

  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-match-assist`;
    const headers = {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    const slots: Array<keyof OutfitCandidate> = ['outer', 'mid', 'top', 'bottom', 'shoes', 'bag', 'accessory', 'accessory_2'];

    const candidates = ruleBased.map(({ outfit, matchScore }, idx) => ({
      index: idx,
      ruleScore: matchScore.score,
      items: slots
        .filter(s => outfit[s])
        .map(s => {
          const p = outfit[s] as Product;
          return {
            slot_type: s,
            name: p.name,
            brand: p.brand || '',
            color: p.color || '',
            color_family: p.color_family || '',
            material: p.material || '',
            pattern: p.pattern || '',
            silhouette: p.silhouette || '',
            sub_category: p.sub_category || '',
            vibe: p.vibe || [],
            formality: p.formality,
            warmth: p.warmth,
          };
        }),
    }));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        candidates,
        context: {
          gender: context.gender,
          bodyType: context.bodyType,
          vibe: context.vibe,
          season: context.targetSeason,
          warmth: context.targetWarmth,
        },
        topN: finalCount,
      }),
    });

    if (!response.ok) return ruleBased.slice(0, finalCount);

    const data = await response.json();

    if (!data.success || !data.selected || data.fallback) {
      return ruleBased.slice(0, finalCount);
    }

    const selectedIndices: number[] = data.selected
      .map((s: { index: number }) => s.index)
      .filter((idx: number) => idx >= 0 && idx < ruleBased.length);

    if (selectedIndices.length === 0) return ruleBased.slice(0, finalCount);

    const dedupedResult = deduplicateOutfits(
      selectedIndices.map((idx: number) => ruleBased[idx]),
      finalCount,
      strictDedup
    );

    if (!strictDedup && dedupedResult.length < finalCount) {
      for (const item of ruleBased) {
        if (dedupedResult.length >= finalCount) break;
        if (!dedupedResult.includes(item)) {
          if (canAddWithoutDuplicates(dedupedResult, item)) {
            dedupedResult.push(item);
          }
        }
      }
    }

    if (!strictDedup && dedupedResult.length < finalCount) {
      for (const item of ruleBased) {
        if (dedupedResult.length >= finalCount) break;
        if (!dedupedResult.includes(item)) dedupedResult.push(item);
      }
    }

    return dedupedResult.slice(0, finalCount);
  } catch (err) {
    console.error('AI refinement failed, falling back to rule-based:', err);
    const fallback = deduplicateOutfits(ruleBased, finalCount, strictDedup);
    return fallback.length > 0 ? fallback : (strictDedup ? ruleBased.slice(0, finalCount) : ruleBased.slice(0, finalCount));
  }
}

async function triggerImageFeatureAnalysis(products: Product[]): Promise<void> {
  const needsAnalysis = products.filter(p => p.image_url && !p.image_features);
  if (needsAnalysis.length === 0) return;

  const BATCH_SIZE = 10;
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-product-image`;
  const headers = {
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  for (let i = 0; i < needsAnalysis.length; i += BATCH_SIZE) {
    const batch = needsAnalysis.slice(i, i + BATCH_SIZE);
    try {
      await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          batchProductIds: batch.map(p => p.id),
        }),
      });
    } catch (err) {
      console.error('Image feature batch analysis failed:', err);
    }
  }
}
