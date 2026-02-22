import { Product } from '../data/outfits';
import { OutfitCandidate, MatchScore } from './matchingEngine';
import {
  COLOR_PROFILES,
  getColorHarmonyScore,
  isNeutralColor,
  isEarthTone,
  inferColorFamily,
  inferMaterialGroup,
  inferSubCategoryStyle,
  getMaterialCompatScore,
  getPatternCompatScore,
  getVibeCompatScore,
  STYLE_COMPAT,
  SILHOUETTE_BALANCE,
  getBodyTypeSilhouetteScore,
  getSubCategoryPairingBonus,
  SEASON_WARMTH_TARGETS,
} from './matchingData';

function getAllItems(outfit: OutfitCandidate): Product[] {
  return [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes, outfit.bag, outfit.accessory, outfit.accessory_2]
    .filter(Boolean) as Product[];
}

function getCoreItems(outfit: OutfitCandidate): Product[] {
  return [outfit.outer, outfit.mid, outfit.top, outfit.bottom, outfit.shoes]
    .filter(Boolean) as Product[];
}

interface AxisResult {
  score: number;
  hasData: boolean;
}

function getColorFamily(item: Product): string {
  return inferColorFamily(item);
}

function scoreColorMatchAxis(outfit: OutfitCandidate): AxisResult {
  const items = getAllItems(outfit);
  if (items.length < 3) return { score: 0, hasData: false };

  const colorFamilies = items.map(getColorFamily).filter(Boolean);
  if (colorFamilies.length < 2) return { score: 50, hasData: false };

  let totalHarmony = 0;
  let pairCount = 0;

  for (let i = 0; i < colorFamilies.length; i++) {
    for (let j = i + 1; j < colorFamilies.length; j++) {
      totalHarmony += getColorHarmonyScore(colorFamilies[i], colorFamilies[j]);
      pairCount++;
    }
  }

  const avgHarmony = pairCount > 0 ? totalHarmony / pairCount : 50;

  const neutralCount = colorFamilies.filter(c => isNeutralColor(c)).length;
  const accentColors = colorFamilies.filter(c => !isNeutralColor(c) && !isEarthTone(c));
  const uniqueAccents = new Set(accentColors);

  let bonus = 0;
  if (neutralCount >= colorFamilies.length - 1 && uniqueAccents.size <= 1) bonus += 10;
  if (uniqueAccents.size > 2) bonus -= 15;

  const earthCount = colorFamilies.filter(c => isEarthTone(c)).length;
  if (earthCount >= 2 && neutralCount >= 1) bonus += 5;

  return {
    score: Math.max(0, Math.min(100, avgHarmony + bonus)),
    hasData: true,
  };
}

function scoreToneMatchAxis(outfit: OutfitCandidate): AxisResult {
  const items = getAllItems(outfit);
  if (items.length < 3) return { score: 0, hasData: false };

  const tones = items.map(i => i.color_tone || '').filter(Boolean);
  if (tones.length < Math.ceil(items.length * 0.4)) return { score: 50, hasData: false };

  let score = 100;
  const warmCount = tones.filter(t => t === 'warm').length;
  const coolCount = tones.filter(t => t === 'cool').length;
  const neutralCount = tones.filter(t => t === 'neutral').length;
  const toneSet = new Set(tones);

  if (warmCount > 0 && coolCount > 0) {
    const mixRatio = Math.min(warmCount, coolCount) / Math.max(warmCount, coolCount);
    if (mixRatio > 0.5 && neutralCount === 0) score -= 25;
    else if (mixRatio > 0.3) score -= 12;
  }

  if (toneSet.size === 1) score += 20;
  else if (toneSet.size === 2 && neutralCount > 0) score += 12;

  return { score: Math.max(0, Math.min(100, score)), hasData: true };
}

function scorePatternBalanceAxis(outfit: OutfitCandidate): AxisResult {
  const items = getAllItems(outfit);
  if (items.length < 3) return { score: 0, hasData: false };

  const patterns = items.map(i => i.pattern || '').filter(Boolean);
  if (patterns.length < Math.ceil(items.length * 0.4)) return { score: 50, hasData: false };

  const nonSolid = patterns.filter(p => p !== 'solid');

  if (nonSolid.length === 0) return { score: 92, hasData: true };
  if (nonSolid.length === 1) return { score: 95, hasData: true };

  let totalCompat = 0;
  let pairCount = 0;
  for (let i = 0; i < nonSolid.length; i++) {
    for (let j = i + 1; j < nonSolid.length; j++) {
      totalCompat += getPatternCompatScore(nonSolid[i], nonSolid[j]);
      pairCount++;
    }
  }

  let score = pairCount > 0 ? totalCompat / pairCount : 70;

  const visiblePatterns = [
    outfit.outer ? (outfit.outer.pattern || '') : null,
    outfit.mid ? (outfit.mid.pattern || '') : null,
    outfit.top.pattern || '',
    outfit.bottom.pattern || '',
  ].filter(Boolean).filter(p => p !== 'solid');

  if (visiblePatterns.length > 2) score -= 15;
  if (nonSolid.length >= 3) score -= 10;

  return { score: Math.max(0, Math.min(100, score)), hasData: true };
}

function scoreFormalityMatchAxis(outfit: OutfitCandidate): AxisResult {
  const items = getCoreItems(outfit);
  if (items.length < 3) return { score: 0, hasData: false };

  const formalities = items
    .map(i => i.formality)
    .filter((f): f is number => typeof f === 'number');

  if (formalities.length < 2) return { score: 50, hasData: false };

  let score = 100;
  const avg = formalities.reduce((s, f) => s + f, 0) / formalities.length;

  for (const f of formalities) {
    const dev = Math.abs(f - avg);
    if (dev > 2) score -= 20;
    else if (dev > 1) score -= 10;
  }

  const avgDev = formalities.reduce((s, f) => s + Math.abs(f - avg), 0) / formalities.length;
  if (avgDev < 0.5) score += 15;

  const range = Math.max(...formalities) - Math.min(...formalities);
  if (range > 2) score -= 15;

  return { score: Math.max(0, Math.min(100, score)), hasData: true };
}

function scoreWarmthMatchAxis(outfit: OutfitCandidate, targetWarmth?: number, targetSeason?: string): AxisResult {
  const items = getCoreItems(outfit);
  if (items.length < 3) return { score: 0, hasData: false };

  const warmths = items
    .map(i => i.warmth)
    .filter((w): w is number => typeof w === 'number');

  if (warmths.length < 2) return { score: 50, hasData: false };

  let score = 100;
  const avg = warmths.reduce((s, w) => s + w, 0) / warmths.length;

  const effectiveTarget = targetWarmth ?? (targetSeason ? SEASON_WARMTH_TARGETS[targetSeason]?.ideal : undefined);

  if (effectiveTarget !== undefined) {
    const targetDev = Math.abs(avg - effectiveTarget);
    if (targetDev > 2) score -= 45;
    else if (targetDev > 1.5) score -= 30;
    else if (targetDev > 1) score -= 15;
    else if (targetDev <= 0.5) score += 15;
    else score += 5;
  }

  if (targetSeason) {
    const bounds = SEASON_WARMTH_TARGETS[targetSeason];
    if (bounds) {
      if (avg < bounds.min) score -= Math.min(30, (bounds.min - avg) * 20);
      if (avg > bounds.max) score -= Math.min(30, (avg - bounds.max) * 20);
    }
  }

  const range = Math.max(...warmths) - Math.min(...warmths);
  if (range > 2) score -= 20;
  else if (range <= 1) score += 10;

  return { score: Math.max(0, Math.min(100, score)), hasData: true };
}

function scoreSeasonMatchAxis(outfit: OutfitCandidate, targetSeason?: string): AxisResult {
  const items = getCoreItems(outfit);
  if (items.length < 3) return { score: 0, hasData: false };
  if (!targetSeason) return { score: 50, hasData: false };

  let score = 100;
  let matchCount = 0;
  let mismatchCount = 0;

  for (const item of items) {
    const seasons = item.season || [];
    if (seasons.includes(targetSeason)) {
      matchCount++;
      score += 8;
    } else if (seasons.length === 0) {
      score -= 5;
    } else {
      mismatchCount++;
      score -= 18;
    }
  }

  if (matchCount === items.length) score += 20;
  if (mismatchCount >= Math.ceil(items.length * 0.5)) score -= 25;

  return { score: Math.max(0, Math.min(100, score)), hasData: true };
}

function scoreSilhouetteBalanceAxis(outfit: OutfitCandidate, bodyType?: string): AxisResult {
  const topSil = outfit.top.silhouette || '';
  const bottomSil = outfit.bottom.silhouette || '';
  const outerSil = outfit.outer?.silhouette || '';
  const midSil = outfit.mid?.silhouette || '';

  const hasEnoughData = (topSil && bottomSil) || (outerSil && bottomSil) || (outerSil && topSil);
  if (!hasEnoughData) return { score: 50, hasData: false };

  let score = 70;
  let evaluations = 0;
  let bonusSum = 0;

  const evalPair = (sil1: string, sil2: string): number => {
    if (!sil1 || !sil2) return 0;
    const goodPairs = SILHOUETTE_BALANCE[sil1];
    if (goodPairs && goodPairs.includes(sil2)) return 30;
    if (sil1 === sil2) {
      if (sil1 === 'oversized' || sil1 === 'wide') return -20;
      if (sil1 === 'fitted' || sil1 === 'slim') return -5;
      return 0;
    }
    return 0;
  };

  if (topSil && bottomSil) {
    bonusSum += evalPair(topSil, bottomSil);
    evaluations++;
  }

  if (outerSil && bottomSil) {
    bonusSum += evalPair(outerSil, bottomSil) * 0.7;
    evaluations += 0.7;
  }

  if (outerSil && topSil) {
    if (outerSil === 'oversized' && topSil === 'oversized') bonusSum -= 15;
    else bonusSum += evalPair(outerSil, topSil) * 0.5;
    evaluations += 0.5;
  }

  if (midSil && topSil) {
    if (midSil === 'oversized' && topSil === 'oversized') bonusSum -= 10;
    else if (midSil === 'fitted' && topSil === 'fitted') bonusSum += 5;
    evaluations += 0.3;
  }

  if (evaluations > 0) score += bonusSum / Math.max(1, evaluations);

  if (bodyType) {
    let bodyBonus = 0;
    let bodyChecks = 0;
    const checks: Array<[string, string]> = [
      ['top', topSil], ['bottom', bottomSil], ['outer', outerSil], ['mid', midSil],
    ];
    for (const [cat, sil] of checks) {
      if (sil) {
        bodyBonus += getBodyTypeSilhouetteScore(bodyType, cat, sil);
        bodyChecks++;
      }
    }
    if (bodyChecks > 0) score += bodyBonus / bodyChecks;

    if (bottomSil === 'wide') score += 8;
  }

  return { score: Math.max(0, Math.min(100, score)), hasData: true };
}

function scoreMaterialCompatAxis(outfit: OutfitCandidate): AxisResult {
  const items = getCoreItems(outfit);
  const groups = items
    .map(item => inferMaterialGroup(item))
    .filter(Boolean) as string[];

  if (groups.length < 2) return { score: 50, hasData: false };

  let totalCompat = 0;
  let pairCount = 0;

  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      totalCompat += getMaterialCompatScore(groups[i], groups[j]);
      pairCount++;
    }
  }

  return {
    score: Math.round((totalCompat / pairCount) * 100),
    hasData: true,
  };
}

function scoreSubCategoryMatchAxis(outfit: OutfitCandidate): AxisResult {
  const items = getCoreItems(outfit);
  const styles = items
    .map(item => inferSubCategoryStyle(item))
    .filter(Boolean) as string[];

  if (styles.length < 2) return { score: 50, hasData: false };

  let totalCompat = 0;
  let pairCount = 0;

  for (let i = 0; i < styles.length; i++) {
    for (let j = i + 1; j < styles.length; j++) {
      totalCompat += STYLE_COMPAT[styles[i]]?.[styles[j]] ?? 0.5;
      pairCount++;
    }
  }

  let score = Math.round((totalCompat / pairCount) * 100);

  const subCats = items.map(p => (p.sub_category || '').toLowerCase().replace(/[\s-]/g, '_')).filter(Boolean);
  let pairingBonus = 0;
  let pairingChecks = 0;
  for (let i = 0; i < subCats.length; i++) {
    for (let j = i + 1; j < subCats.length; j++) {
      const bonus = getSubCategoryPairingBonus(subCats[i], subCats[j]);
      if (bonus !== 0) {
        pairingBonus += bonus;
        pairingChecks++;
      }
    }
  }
  if (pairingChecks > 0) score += Math.round(pairingBonus / pairingChecks);

  return {
    score: Math.max(0, Math.min(100, score)),
    hasData: true,
  };
}

function scoreColorDepthAxis(outfit: OutfitCandidate): AxisResult {
  const items = getCoreItems(outfit);
  const colors = items.map(getColorFamily).filter(Boolean);

  if (colors.length < 3) return { score: 50, hasData: false };

  const neutrals = colors.filter(c => isNeutralColor(c));
  const accents = colors.filter(c => !isNeutralColor(c));
  const uniqueAccents = [...new Set(accents)];
  const uniqueColors = new Set(colors);

  let score = 70;

  if (uniqueAccents.length <= 1 && neutrals.length >= 2) score += 20;

  if (uniqueAccents.length === 2) {
    const p1 = COLOR_PROFILES[uniqueAccents[0]];
    const p2 = COLOR_PROFILES[uniqueAccents[1]];
    if (p1 && p2 && p1.warmth === p2.warmth) score += 12;
    else if (p1 && p2 && p1.lightness !== p2.lightness) score += 8;
  }

  const colorCounts = new Map<string, number>();
  colors.forEach(c => colorCounts.set(c, (colorCounts.get(c) || 0) + 1));
  const sortedCounts = [...colorCounts.values()].sort((a, b) => b - a);

  if (sortedCounts.length >= 2) {
    const baseRatio = sortedCounts[0] / colors.length;
    if (baseRatio >= 0.4 && baseRatio <= 0.7) score += 10;
  }

  if (uniqueColors.size > 4) score -= 15;

  if (uniqueColors.size === 1 && isNeutralColor(colors[0])) {
    score -= 20;
  }
  if (uniqueColors.size <= 2 && colors.every(c => isNeutralColor(c)) && colors.length >= 4) {
    score -= 15;
  }

  const blackCount = colors.filter(c => c === 'black').length;
  if (blackCount >= 3) score -= 15;
  if (blackCount >= 4) score -= 15;

  if (uniqueColors.size >= 2 && !colors.every(c => isNeutralColor(c))) {
    score += 10;
  }

  return { score: Math.max(0, Math.min(100, score)), hasData: true };
}

function scoreMoodCoherenceAxis(outfit: OutfitCandidate): AxisResult {
  const items = getCoreItems(outfit);
  const vibeArrays = items.map(item => item.vibe || []).filter(v => v.length > 0);

  if (vibeArrays.length < 2) return { score: 50, hasData: false };

  let totalScore = 0;
  let pairCount = 0;

  for (let i = 0; i < vibeArrays.length; i++) {
    for (let j = i + 1; j < vibeArrays.length; j++) {
      const vibes1 = vibeArrays[i];
      const vibes2 = vibeArrays[j];
      let pairTotal = 0;
      let pairComparisons = 0;
      for (const v1 of vibes1) {
        for (const v2 of vibes2) {
          pairTotal += getVibeCompatScore(v1, v2);
          pairComparisons++;
        }
      }
      const avgCompat = pairComparisons > 0 ? pairTotal / pairComparisons : 50;
      const bestCompat = Math.max(...vibes1.flatMap(v1 => vibes2.map(v2 => getVibeCompatScore(v1, v2))));
      totalScore += avgCompat * 0.6 + bestCompat * 0.4;
      pairCount++;
    }
  }

  let score = pairCount > 0 ? totalScore / pairCount : 50;

  const allVibes = vibeArrays.flat();
  const vibeCounts = new Map<string, number>();
  allVibes.forEach(v => vibeCounts.set(v, (vibeCounts.get(v) || 0) + 1));
  const maxShared = Math.max(...vibeCounts.values());
  if (maxShared >= vibeArrays.length) score += 10;
  else if (maxShared >= vibeArrays.length * 0.75) score += 5;

  return { score: Math.max(0, Math.min(100, score)), hasData: true };
}

function scoreAccessoryHarmonyAxis(outfit: OutfitCandidate): AxisResult {
  const accessories = [outfit.bag, outfit.accessory, outfit.accessory_2].filter(Boolean) as Product[];
  if (accessories.length === 0) return { score: 50, hasData: false };

  const mainItems = getCoreItems(outfit);
  const mainColors = mainItems.map(getColorFamily).filter(Boolean);
  const mainFormalities = mainItems.map(i => i.formality).filter((f): f is number => typeof f === 'number');

  let score = 70;

  for (const acc of accessories) {
    const accColor = getColorFamily(acc);
    const accFormality = acc.formality;

    if (accColor && mainColors.length > 0) {
      let bestHarmony = 0;
      for (const mc of mainColors) {
        bestHarmony = Math.max(bestHarmony, getColorHarmonyScore(mc, accColor));
      }
      if (bestHarmony >= 85) score += 10;
      else if (bestHarmony >= 70) score += 5;
      else if (bestHarmony < 50) score -= 10;
    }

    if (accFormality !== undefined && mainFormalities.length > 0) {
      const avgMain = mainFormalities.reduce((s, f) => s + f, 0) / mainFormalities.length;
      const deviation = Math.abs(accFormality - avgMain);
      if (deviation > 2) score -= 15;
      else if (deviation <= 1) score += 5;
    }
  }

  return { score: Math.max(0, Math.min(100, score)), hasData: true };
}

function scoreImageFeatureAxis(outfit: OutfitCandidate): AxisResult {
  const items = getCoreItems(outfit);
  const withFeatures = items.filter(i => i.image_features);
  if (withFeatures.length < 2) return { score: 50, hasData: false };

  let score = 70;

  const textures = withFeatures.map(i => i.image_features!.texture);
  const textureSet = new Set(textures);
  if (textureSet.size <= 2) score += 10;
  if (textureSet.size === 1) score += 5;

  const weights = withFeatures.map(i => i.image_features!.visualWeight);
  const heavyCount = weights.filter(w => w === 'heavy').length;
  const lightCount = weights.filter(w => w === 'light').length;
  if (heavyCount > 0 && lightCount > 0) score += 8;
  if (heavyCount === weights.length || lightCount === weights.length) score -= 5;

  const allStyles = withFeatures.flatMap(i => i.image_features!.styleAttributes);
  const styleCounts = new Map<string, number>();
  allStyles.forEach(s => styleCounts.set(s, (styleCounts.get(s) || 0) + 1));
  const maxSharedStyle = Math.max(...styleCounts.values());
  if (maxSharedStyle >= withFeatures.length) score += 15;
  else if (maxSharedStyle >= Math.ceil(withFeatures.length * 0.6)) score += 8;

  const brightnesses = withFeatures.map(i => i.image_features!.brightnessLevel);
  const darkItems = brightnesses.filter(b => b === 'dark').length;
  const brightItems = brightnesses.filter(b => b === 'bright' || b === 'light').length;
  if (darkItems > 0 && brightItems > 0) score += 5;
  if (darkItems === brightnesses.length && brightnesses.length >= 3) score -= 10;

  return { score: Math.max(0, Math.min(100, score)), hasData: true };
}

const BASE_WEIGHTS = {
  colorMatch: 0.12,
  toneMatch: 0.07,
  patternBalance: 0.07,
  formalityMatch: 0.09,
  warmthMatch: 0.12,
  seasonMatch: 0.12,
  silhouetteBalance: 0.09,
  materialCompat: 0.06,
  subCategoryMatch: 0.09,
  colorDepth: 0.04,
  moodCoherence: 0.04,
  accessoryHarmony: 0.02,
  imageFeature: 0.07,
};

export function scoreOutfit(
  outfit: OutfitCandidate,
  context?: { targetWarmth?: number; targetSeason?: string; bodyType?: string }
): MatchScore {
  const axes: { key: keyof typeof BASE_WEIGHTS; result: AxisResult }[] = [
    { key: 'colorMatch', result: scoreColorMatchAxis(outfit) },
    { key: 'toneMatch', result: scoreToneMatchAxis(outfit) },
    { key: 'patternBalance', result: scorePatternBalanceAxis(outfit) },
    { key: 'formalityMatch', result: scoreFormalityMatchAxis(outfit) },
    { key: 'warmthMatch', result: scoreWarmthMatchAxis(outfit, context?.targetWarmth, context?.targetSeason) },
    { key: 'seasonMatch', result: scoreSeasonMatchAxis(outfit, context?.targetSeason) },
    { key: 'silhouetteBalance', result: scoreSilhouetteBalanceAxis(outfit, context?.bodyType) },
    { key: 'materialCompat', result: scoreMaterialCompatAxis(outfit) },
    { key: 'subCategoryMatch', result: scoreSubCategoryMatchAxis(outfit) },
    { key: 'colorDepth', result: scoreColorDepthAxis(outfit) },
    { key: 'moodCoherence', result: scoreMoodCoherenceAxis(outfit) },
    { key: 'accessoryHarmony', result: scoreAccessoryHarmonyAxis(outfit) },
    { key: 'imageFeature', result: scoreImageFeatureAxis(outfit) },
  ];

  let activeWeight = 0;
  let weightedSum = 0;
  const breakdown: Record<string, number> = {};

  for (const { key, result } of axes) {
    breakdown[key] = Math.round(result.score);

    if (result.hasData) {
      const w = BASE_WEIGHTS[key];
      activeWeight += w;
      weightedSum += result.score * w;
    }
  }

  const finalScore = activeWeight > 0 ? weightedSum / activeWeight : 50;

  return {
    score: Math.round(finalScore),
    breakdown: breakdown as MatchScore['breakdown'],
  };
}
