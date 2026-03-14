import { Product } from '../../data/outfits';
import { AssemblyContext, SlotName } from './types';
import { evaluateAllRules } from './rules';
import { resolveColorFamily, getColorHarmonyScore } from './colorDna';
import { getVibeItemAffinity } from './vibeAffinity';
import { getLookDNA, getVibeDNA } from '../../data/vibeItems/vibeDna';
import { VibeKey, LookKey, VibeDNA } from '../../data/vibeItems/types';

const MAX_RESULTS = 5000;

const BEAM_POOL_SIZE: Record<string, number> = {
  top: 12,
  bottom: 12,
  shoes: 12,
  outer: 10,
  mid: 10,
  bag: 10,
  accessory: 10,
};

const RAW_POOL_MULTIPLIER = 4;

const ITEM_WARMTH_LIMITS: Record<string, Record<string, { min: number; max: number }>> = {
  summer: {
    top:    { min: 1, max: 2.5 },
    bottom: { min: 1, max: 3.0 },
    shoes:  { min: 1, max: 4.0 },
    bag:    { min: 1, max: 5.0 },
    accessory: { min: 1, max: 5.0 },
  },
  spring: {
    top:    { min: 1, max: 3.5 },
    bottom: { min: 1, max: 3.5 },
    shoes:  { min: 1, max: 4.0 },
    outer:  { min: 2, max: 4.0 },
    mid:    { min: 1.5, max: 3.5 },
    bag:    { min: 1, max: 5.0 },
    accessory: { min: 1, max: 5.0 },
  },
  fall: {
    top:    { min: 2, max: 4.5 },
    bottom: { min: 1.5, max: 4.5 },
    shoes:  { min: 1.5, max: 5.0 },
    outer:  { min: 2.5, max: 5.0 },
    mid:    { min: 2, max: 4.5 },
    bag:    { min: 1, max: 5.0 },
    accessory: { min: 1, max: 5.0 },
  },
  winter: {
    top:    { min: 2.5, max: 5.0 },
    bottom: { min: 2, max: 5.0 },
    shoes:  { min: 2, max: 5.0 },
    outer:  { min: 3, max: 5.0 },
    mid:    { min: 2.5, max: 5.0 },
    bag:    { min: 1, max: 5.0 },
    accessory: { min: 1, max: 5.0 },
  },
};

const SEASON_WARMTH: Record<string, { min: number; max: number; ideal: number }> = {
  spring: { min: 1.5, max: 3.5, ideal: 2.5 },
  summer: { min: 1, max: 2.5, ideal: 1.5 },
  fall: { min: 2.5, max: 4, ideal: 3.2 },
  winter: { min: 3.5, max: 5, ideal: 4.2 },
};

interface SlotPool {
  slot: SlotName;
  products: Product[];
  required: boolean;
}

function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function scoreProductForSlot(
  product: Product,
  context: AssemblyContext,
  usageCounts: Record<string, number>
): number {
  let score = 100;

  if (context.vibe && product.vibe?.length) {
    const hasMatchingVibe = product.vibe.includes(context.vibe);
    score += hasMatchingVibe ? 25 : -10;
  }

  if (context.vibe) {
    const affinity = getVibeItemAffinity(product, context.vibe);
    if (affinity >= 0.8) score += 25;
    else if (affinity >= 0.5) score += 15;
    else if (affinity >= 0.3) score += 5;
    else score -= 5;
  }

  if (context.targetSeason && product.season?.length) {
    if (product.season.includes(context.targetSeason)) score += 20;
    else score -= 15;
  }

  if (context.targetWarmth !== undefined && typeof product.warmth === 'number') {
    const diff = Math.abs(product.warmth - context.targetWarmth);
    if (diff <= 0.5) score += 15;
    else if (diff <= 1) score += 8;
    else if (diff > 2) score -= 20;
  }

  const usage = usageCounts[product.id] ?? 0;
  if (usage === 0) score += 20;
  else if (usage === 1) score += 8;
  else if (usage >= 2) score -= usage * 12;

  return score;
}

function diversitySampleFromPool(
  scored: Array<{ product: Product; score: number }>,
  maxCount: number
): Product[] {
  const colorBuckets = new Map<string, Array<{ product: Product; score: number }>>();
  const patternBuckets = new Map<string, Array<{ product: Product; score: number }>>();

  for (const entry of scored) {
    const cf = resolveColorFamily(entry.product.color || '', entry.product.color_family) || 'unknown';
    if (!colorBuckets.has(cf)) colorBuckets.set(cf, []);
    colorBuckets.get(cf)!.push(entry);

    const pat = entry.product.pattern || 'none';
    if (!patternBuckets.has(pat)) patternBuckets.set(pat, []);
    patternBuckets.get(pat)!.push(entry);
  }

  const result: Product[] = [];
  const usedIds = new Set<string>();

  const maxBlack = Math.max(1, Math.floor(maxCount * 0.25));
  const blackEntries = colorBuckets.get('black') || [];
  for (const entry of blackEntries.slice(0, maxBlack)) {
    if (result.length >= maxCount) break;
    result.push(entry.product);
    usedIds.add(entry.product.id);
  }

  const nonBlack = [...colorBuckets.entries()].filter(([k]) => k !== 'black' && k !== 'unknown');
  if (nonBlack.length > 0) {
    const remaining = maxCount - result.length;
    const perBucket = Math.max(1, Math.ceil(remaining / nonBlack.length));
    for (const [, bucket] of nonBlack) {
      let added = 0;
      for (const entry of bucket) {
        if (result.length >= maxCount || added >= perBucket) break;
        if (!usedIds.has(entry.product.id)) {
          result.push(entry.product);
          usedIds.add(entry.product.id);
          added++;
        }
      }
      if (result.length >= maxCount) break;
    }
  }

  if (result.length < maxCount) {
    const patKeys = [...patternBuckets.keys()].filter(k => k !== 'none');
    for (const pat of patKeys) {
      if (result.length >= maxCount) break;
      const bucket = patternBuckets.get(pat)!;
      for (const entry of bucket) {
        if (result.length >= maxCount) break;
        if (!usedIds.has(entry.product.id)) {
          result.push(entry.product);
          usedIds.add(entry.product.id);
          break;
        }
      }
    }
  }

  if (result.length < maxCount) {
    const blackInResult = result.filter(
      p => (resolveColorFamily(p.color || '', p.color_family) || 'unknown') === 'black'
    ).length;
    for (const { product } of scored) {
      if (result.length >= maxCount) break;
      if (usedIds.has(product.id)) continue;
      const cf = resolveColorFamily(product.color || '', product.color_family) || 'unknown';
      if (cf === 'black' && blackInResult >= maxBlack) continue;
      result.push(product);
      usedIds.add(product.id);
    }
  }

  if (result.length < maxCount) {
    for (const { product } of scored) {
      if (result.length >= maxCount) break;
      if (!usedIds.has(product.id)) {
        result.push(product);
        usedIds.add(product.id);
      }
    }
  }

  return result.slice(0, maxCount);
}

function pickTopCandidates(
  products: Product[],
  beamSize: number,
  context: AssemblyContext,
  usageCounts: Record<string, number>
): Product[] {
  if (products.length <= beamSize) return products;

  const rawCap = beamSize * RAW_POOL_MULTIPLIER;
  const scored = products.map(p => ({
    product: p,
    score: scoreProductForSlot(p, context, usageCounts),
  }));
  scored.sort((a, b) => b.score - a.score);

  const phase1 = scored.slice(0, rawCap);

  return diversitySampleFromPool(phase1, beamSize);
}

export function shouldIncludeOuter(season?: string, warmth?: number): boolean {
  if (season === 'summer') return false;
  if (warmth !== undefined && warmth <= 2) return false;
  return true;
}

export type MidTier = 'none' | 'light-only' | 'light-or-medium' | 'any';

export function getMidTier(season?: string, warmth?: number): MidTier {
  if (season === 'summer') return 'none';
  if (warmth !== undefined && warmth <= 3) return 'none';
  if (season === 'spring') return 'light-only';
  if (season === 'fall') return 'light-or-medium';
  if (season === 'winter') return 'any';
  return 'any';
}

function midPassesTierFilter(product: Product, tier: MidTier): boolean {
  if (tier === 'none') return false;
  if (tier === 'any') return true;
  const w = typeof product.warmth === 'number' ? product.warmth : 3;
  if (tier === 'light-only') return w <= 2.5;
  if (tier === 'light-or-medium') return w <= 3.5;
  return true;
}

const OUTER_MID_WARMTH_BUDGET: Record<string, { min?: number; max: number }> = {
  spring: { max: 6.0 },
  fall:   { max: 7.5 },
  winter: { min: 6.0, max: 9.5 },
};

function outerMidBudgetOk(outer: Product | undefined, mid: Product | undefined, season?: string): boolean {
  if (!season) return true;
  const budget = OUTER_MID_WARMTH_BUDGET[season];
  if (!budget) return true;

  const outerW = outer && typeof outer.warmth === 'number' ? outer.warmth : undefined;
  const midW = mid && typeof mid.warmth === 'number' ? mid.warmth : undefined;

  if (!outer && !mid) return true;

  if (season === 'spring') {
    if (outer && mid) {
      const oW = outerW ?? 3;
      const mW = midW ?? 2.5;
      if (mW > 2.5) return false;
      return (oW + mW) <= budget.max;
    }
    return true;
  }

  if (season === 'fall') {
    if (outer && mid) {
      const oW = outerW ?? 3;
      const mW = midW ?? 2.5;
      if (mW > 2.5 && oW >= 3) return false;
      return (oW + mW) <= budget.max;
    }
    return true;
  }

  if (season === 'winter') {
    if (outer && mid) {
      const oW = outerW ?? 3;
      const mW = midW ?? 2.5;
      const total = oW + mW;
      return total >= (budget.min ?? 0) && total <= budget.max;
    }
    return true;
  }

  if (outer && mid) {
    const oW = outerW ?? 3;
    const mW = midW ?? 2.5;
    return (oW + mW) <= budget.max;
  }
  return true;
}

function quickColorCheck(product: Product, existingFamilies: string[]): boolean {
  if (existingFamilies.length === 0) return true;
  const cf = resolveColorFamily(product.color || '', product.color_family);
  if (!cf) return true;

  for (const existing of existingFamilies) {
    const harmony = getColorHarmonyScore(cf, existing);
    if (harmony < 25) return false;
  }
  return true;
}

function buildSlotPools(
  products: Product[],
  context: AssemblyContext,
  anchor?: { product: Product; slotType: SlotName },
  usageCounts: Record<string, number> = {}
): SlotPool[] {
  const filter = (category: string) =>
    products.filter(p => {
      if (p.category !== category) return false;
      if (p.stock_status && p.stock_status !== 'in_stock') return false;
      if (context.gender && p.gender !== 'UNISEX' && p.gender !== context.gender) return false;
      if (context.bodyType && p.body_type?.length && !p.body_type.includes(context.bodyType.toLowerCase())) return false;
      if (context.vibe && p.vibe?.length && !p.vibe.includes(context.vibe)) return false;

      if (context.targetSeason && p.season?.length) {
        if (!p.season.includes(context.targetSeason)) {
          const adjacent: Record<string, string[]> = {
            spring: ['fall'], summer: ['spring'], fall: ['spring', 'winter'], winter: ['fall'],
          };
          if (!p.season.some(s => (adjacent[context.targetSeason!] || []).includes(s))) return false;
        }
      }

      if (context.targetSeason && typeof p.warmth === 'number') {
        const limits = ITEM_WARMTH_LIMITS[context.targetSeason]?.[category];
        if (limits && (p.warmth < limits.min - 0.5 || p.warmth > limits.max + 0.5)) return false;
      }

      return true;
    });

  const needsOuter = anchor?.slotType === 'outer' || shouldIncludeOuter(context.targetSeason, context.targetWarmth);
  const midTier = anchor?.slotType === 'mid' ? 'any' as MidTier : getMidTier(context.targetSeason, context.targetWarmth);
  const needsMid = midTier !== 'none';

  const pools: SlotPool[] = [];

  const slotConfigs: Array<{ slot: SlotName; category: string; required: boolean }> = [
    { slot: 'top', category: 'top', required: true },
    { slot: 'bottom', category: 'bottom', required: true },
    { slot: 'shoes', category: 'shoes', required: true },
    { slot: 'outer', category: 'outer', required: false },
    { slot: 'mid', category: 'mid', required: false },
    { slot: 'bag', category: 'bag', required: false },
    { slot: 'accessory', category: 'accessory', required: false },
  ];

  for (const cfg of slotConfigs) {
    if (cfg.slot === 'outer' && !needsOuter && anchor?.slotType !== 'outer') continue;
    if (cfg.slot === 'mid' && !needsMid && anchor?.slotType !== 'mid') continue;

    let pool: Product[];
    if (anchor && anchor.slotType === cfg.slot) {
      pool = [anchor.product];
    } else {
      let raw = filter(cfg.category);
      if (cfg.slot === 'mid' && midTier !== 'any') {
        raw = raw.filter(p => midPassesTierFilter(p, midTier));
      }
      const beamSize = BEAM_POOL_SIZE[cfg.slot] ?? 12;
      pool = pickTopCandidates(raw, beamSize, context, usageCounts);
    }

    if (pool.length > 0 || cfg.required) {
      pools.push({ slot: cfg.slot, products: pool, required: cfg.required });
    }
  }

  return pools;
}

function getVibeDNAForContext(context: AssemblyContext): VibeDNA | undefined {
  if (!context.vibe) return undefined;
  try {
    const vibeKey = context.vibe as VibeKey;
    if (context.look) {
      return getLookDNA(vibeKey, context.look as LookKey);
    }
    return getVibeDNA(vibeKey);
  } catch {
    return undefined;
  }
}

export interface OutfitResult {
  items: Record<string, Product>;
  ruleScore: number;
  passesHard: boolean;
}

export async function assembleOutfits(
  products: Product[],
  context: AssemblyContext,
  anchor?: { product: Product; slotType: SlotName },
  usageCounts: Record<string, number> = {}
): Promise<OutfitResult[]> {
  const pools = buildSlotPools(products, context, anchor, usageCounts);
  const vibeDNA = getVibeDNAForContext(context);

  const requiredPools = pools.filter(p => p.required);
  const optionalPools = pools.filter(p => !p.required);

  if (requiredPools.some(p => p.products.length === 0)) {
    return [];
  }

  const results: OutfitResult[] = [];
  let count = 0;

  const [topPool, bottomPool, shoesPool] = [
    requiredPools.find(p => p.slot === 'top')!,
    requiredPools.find(p => p.slot === 'bottom')!,
    requiredPools.find(p => p.slot === 'shoes')!,
  ];

  for (const top of topPool.products) {
    const topCF = resolveColorFamily(top.color || '', top.color_family);

    for (const bottom of bottomPool.products) {
      const bottomCF = resolveColorFamily(bottom.color || '', bottom.color_family);
      if (topCF && bottomCF) {
        const harmony = getColorHarmonyScore(topCF, bottomCF);
        if (harmony < 30) continue;
      }

      for (const shoes of shoesPool.products) {
        if (!quickColorCheck(shoes, [topCF, bottomCF].filter(Boolean))) continue;

        const coreItems: Record<string, Product> = { top, bottom, shoes };
        const coreFamilies = [topCF, bottomCF, resolveColorFamily(shoes.color || '', shoes.color_family)].filter(Boolean);

        const outerPool = optionalPools.find(p => p.slot === 'outer');
        const outerCandidates: (Product | undefined)[] = outerPool ? [undefined, ...outerPool.products] : [undefined];

        for (const outer of outerCandidates) {
          if (outer && !quickColorCheck(outer, coreFamilies)) continue;

          const midPool = optionalPools.find(p => p.slot === 'mid');
          const midCandidates: (Product | undefined)[] = midPool ? [undefined, ...midPool.products] : [undefined];

          for (const mid of midCandidates) {
            if (context.targetSeason === 'spring' && outer && mid) continue;
            if (!outerMidBudgetOk(outer, mid, context.targetSeason)) continue;

            const items: Record<string, Product> = { ...coreItems };
            if (outer) items.outer = outer;
            if (mid) items.mid = mid;

            const allItems = Object.values(items);
            const CLOTHING_KEYS = ['outer', 'mid', 'top', 'bottom'];
            const SHOES_W = 0.4;
            let wSum = 0; let wTot = 0;
            for (const [k, prod] of Object.entries(items)) {
              if (typeof prod.warmth !== 'number') continue;
              if (CLOTHING_KEYS.includes(k)) { wSum += prod.warmth; wTot += 1; }
              else if (k === 'shoes') { wSum += prod.warmth * SHOES_W; wTot += SHOES_W; }
            }
            if (wTot > 0 && context.targetSeason) {
              const avgWarmth = wSum / wTot;
              const bounds = SEASON_WARMTH[context.targetSeason];
              if (bounds && (avgWarmth < bounds.min - 0.8 || avgWarmth > bounds.max + 0.8)) continue;
            }

            const blackCount = allItems
              .map(p => resolveColorFamily(p.color || '', p.color_family))
              .filter(c => c === 'black').length;
            if (blackCount >= 4 && allItems.length >= 5) continue;

            const usedIds = new Set(allItems.map(p => p.id));
            const hash = allItems.map(p => p.id).join('');
            const hashNum = hash.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);

            const bagPool = optionalPools.find(p => p.slot === 'bag');
            if (bagPool?.products.length) {
              const idx = Math.abs(hashNum) % bagPool.products.length;
              for (let bi = 0; bi < bagPool.products.length; bi++) {
                const candidate = bagPool.products[(idx + bi) % bagPool.products.length];
                if (!usedIds.has(candidate.id)) {
                  items.bag = candidate;
                  usedIds.add(candidate.id);
                  break;
                }
              }
              if (!items.bag) items.bag = bagPool.products[idx % bagPool.products.length];
            }

            const accPool = optionalPools.find(p => p.slot === 'accessory');
            if (accPool?.products.length) {
              const idx = Math.abs(hashNum * 31) % accPool.products.length;
              for (let ai = 0; ai < accPool.products.length; ai++) {
                const candidate = accPool.products[(idx + ai) % accPool.products.length];
                if (!usedIds.has(candidate.id)) {
                  items.accessory = candidate;
                  break;
                }
              }
              if (!items.accessory) items.accessory = accPool.products[idx % accPool.products.length];
            }

            const evaluation = evaluateAllRules(items, vibeDNA, context.bodyType);

            results.push({
              items,
              ruleScore: evaluation.compositeScore,
              passesHard: evaluation.passesHard,
            });

            count++;
            if (count >= MAX_RESULTS) break;
            if (count % 1000 === 0) await yieldToMain();
          }
          if (count >= MAX_RESULTS) break;
        }
        if (count >= MAX_RESULTS) break;
      }
      if (count >= MAX_RESULTS) break;
    }
    if (count >= MAX_RESULTS) break;
  }

  return results;
}

export { SEASON_WARMTH, ITEM_WARMTH_LIMITS };
