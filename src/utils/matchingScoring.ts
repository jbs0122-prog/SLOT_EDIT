import { Product } from '../data/outfits';
import { OutfitCandidate, MatchScore } from './matchingEngine';
import { scoreComposition } from './matching/scorer';

export function scoreOutfit(
  outfit: OutfitCandidate,
  context?: { targetWarmth?: number; targetSeason?: string; bodyType?: string; vibe?: string }
): MatchScore {
  const items: Record<string, Product> = {};
  if (outfit.outer) items.outer = outfit.outer;
  if (outfit.mid) items.mid = outfit.mid;
  if (outfit.top) items.top = outfit.top;
  if (outfit.bottom) items.bottom = outfit.bottom;
  if (outfit.shoes) items.shoes = outfit.shoes;
  if (outfit.bag) items.bag = outfit.bag;
  if (outfit.accessory) items.accessory = outfit.accessory;
  if (outfit.accessory_2) items.accessory_2 = outfit.accessory_2;

  const composition = scoreComposition(items, {
    vibe: context?.vibe,
    bodyType: context?.bodyType,
    targetSeason: context?.targetSeason,
    targetWarmth: context?.targetWarmth,
  });

  return {
    score: composition.total,
    breakdown: {
      colorMatch: composition.breakdown.tonalHarmony,
      toneMatch: composition.breakdown.tonalHarmony,
      patternBalance: composition.breakdown.contextFit,
      warmthMatch: composition.breakdown.contextFit,
      seasonMatch: composition.breakdown.contextFit,
      silhouetteBalance: composition.breakdown.proportion,
      materialCompat: composition.breakdown.materialCompat,
      subCategoryMatch: composition.breakdown.formalityCoherence,
      colorDepth: composition.breakdown.colorDepth,
      moodCoherence: composition.breakdown.vibeAffinity,
      accessoryHarmony: composition.breakdown.contextFit,
      imageFeature: composition.breakdown.contextFit,
    },
  };
}
