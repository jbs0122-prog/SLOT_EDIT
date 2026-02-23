import { Product } from '../data/outfits';
import { VIBE_ITEM_DATABASE, VibeKey, SlotCategory, LookKey } from '../data/vibeItemDatabase';

const vibeNameMap: Record<string, VibeKey> = {
  ELEVATED_COOL: 'ELEVATED_COOL',
  EFFORTLESS_NATURAL: 'EFFORTLESS_NATURAL',
  ARTISTIC_MINIMAL: 'ARTISTIC_MINIMAL',
  RETRO_LUXE: 'RETRO_LUXE',
  SPORT_MODERN: 'SPORT_MODERN',
  CREATIVE_LAYERED: 'CREATIVE_LAYERED',
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function buildVibeIndex(): Map<VibeKey, Map<SlotCategory, string[]>> {
  const index = new Map<VibeKey, Map<SlotCategory, string[]>>();

  for (const [vibeKey, vibeDef] of Object.entries(VIBE_ITEM_DATABASE)) {
    const slotMap = new Map<SlotCategory, string[]>();
    const slots: SlotCategory[] = ['outer', 'top', 'bottom', 'shoes', 'bag', 'accessory'];

    for (const slot of slots) {
      const allItems = new Set<string>();
      for (const look of Object.values(vibeDef.looks)) {
        for (const item of look.slots[slot]) {
          allItems.add(normalizeText(item));
        }
      }
      slotMap.set(slot, [...allItems]);
    }

    index.set(vibeKey as VibeKey, slotMap);
  }

  return index;
}

const VIBE_INDEX = buildVibeIndex();

function buildLookIndex(): Map<string, string[]> {
  const index = new Map<string, string[]>();

  for (const [vibeKey, vibeDef] of Object.entries(VIBE_ITEM_DATABASE)) {
    for (const [lookKey, lookDef] of Object.entries(vibeDef.looks)) {
      const slots: SlotCategory[] = ['outer', 'top', 'bottom', 'shoes', 'bag', 'accessory'];
      for (const slot of slots) {
        for (const item of lookDef.slots[slot]) {
          const normalized = normalizeText(item);
          const key = `${vibeKey}:${lookKey}:${slot}`;
          if (!index.has(key)) index.set(key, []);
          index.get(key)!.push(normalized);
        }
      }
    }
  }

  return index;
}

const LOOK_INDEX = buildLookIndex();

function getProductSearchTerms(product: Product): string[] {
  const terms: string[] = [];
  if (product.sub_category) terms.push(normalizeText(product.sub_category));
  if (product.name) terms.push(normalizeText(product.name));
  return terms;
}

function fuzzyMatchScore(productTerms: string[], itemPool: string[]): number {
  let bestScore = 0;

  for (const term of productTerms) {
    for (const poolItem of itemPool) {
      if (term === poolItem || poolItem === term) {
        bestScore = Math.max(bestScore, 1.0);
        continue;
      }

      if (term.includes(poolItem) || poolItem.includes(term)) {
        const shorter = term.length < poolItem.length ? term : poolItem;
        const longer = term.length < poolItem.length ? poolItem : term;
        const ratio = shorter.length / longer.length;
        bestScore = Math.max(bestScore, 0.6 + ratio * 0.3);
        continue;
      }

      const termWords = term.split(/\s+/);
      const poolWords = poolItem.split(/\s+/);
      let matchedWords = 0;
      for (const tw of termWords) {
        if (tw.length < 3) continue;
        for (const pw of poolWords) {
          if (pw.length < 3) continue;
          if (tw === pw || tw.includes(pw) || pw.includes(tw)) {
            matchedWords++;
            break;
          }
        }
      }
      if (matchedWords > 0) {
        const totalSignificant = Math.max(
          termWords.filter(w => w.length >= 3).length,
          poolWords.filter(w => w.length >= 3).length,
          1
        );
        const wordScore = 0.3 + (matchedWords / totalSignificant) * 0.5;
        bestScore = Math.max(bestScore, wordScore);
      }
    }
  }

  return bestScore;
}

export function getVibeItemAffinity(product: Product, vibe: string): number {
  const vibeKey = vibeNameMap[vibe];
  if (!vibeKey) return 0;

  const category = product.category as SlotCategory;
  const slotCategory = category === 'mid' ? 'top' : category;
  const slotMap = VIBE_INDEX.get(vibeKey);
  if (!slotMap) return 0;

  const itemPool = slotMap.get(slotCategory);
  if (!itemPool || itemPool.length === 0) return 0;

  const searchTerms = getProductSearchTerms(product);
  if (searchTerms.length === 0) return 0;

  return fuzzyMatchScore(searchTerms, itemPool);
}

export function getVibeItemAffinityBonus(product: Product, vibe: string): number {
  const affinity = getVibeItemAffinity(product, vibe);
  if (affinity >= 0.8) return 25;
  if (affinity >= 0.5) return 15;
  if (affinity >= 0.3) return 5;
  return -5;
}

export function getBestVibesForProduct(product: Product): Array<{ vibe: VibeKey; score: number }> {
  const results: Array<{ vibe: VibeKey; score: number }> = [];

  for (const vibeKey of Object.keys(VIBE_ITEM_DATABASE) as VibeKey[]) {
    const score = getVibeItemAffinity(product, vibeKey);
    if (score > 0) {
      results.push({ vibe: vibeKey, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

export function getVibeItemAffinityForLook(
  product: Product,
  vibe: string,
  look: LookKey
): number {
  const vibeKey = vibeNameMap[vibe];
  if (!vibeKey) return 0;

  const category = product.category as SlotCategory;
  const slotCategory = category === 'mid' ? 'top' : category;
  const key = `${vibeKey}:${look}:${slotCategory}`;
  const itemPool = LOOK_INDEX.get(key);
  if (!itemPool || itemPool.length === 0) return 0;

  const searchTerms = getProductSearchTerms(product);
  if (searchTerms.length === 0) return 0;

  return fuzzyMatchScore(searchTerms, itemPool);
}

export function isItemInVibePool(product: Product, vibe: string): boolean {
  return getVibeItemAffinity(product, vibe) >= 0.3;
}
