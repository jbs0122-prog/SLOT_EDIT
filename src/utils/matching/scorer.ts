import { Product } from '../../data/outfits';
import { CompositionScore, AssemblyContext } from './types';
import { evaluateAllRules } from './rules';
import { computeSeasonFit, computeWarmthFit, computeAccessoryHarmony, computeImageFeatureScore, computePatternBalance } from './contextLayer';
import { resolveColorFamily, isNeutralColor, analyzeColorComposition } from './colorDna';
import { getVibeItemAffinity, getLookAffinityScore } from './vibeAffinity';
import { getMaterialCompatScore, inferMaterialGroup } from './itemDna';
import { getVibeDistance, getLookDNA, getVibeDNA } from '../../data/vibeItems/vibeDna';
import { VibeKey, VibeDNA, LookKey } from '../../data/vibeItems/types';

const SCORE_WEIGHTS = {
  proportion: 0.12,
  tonalHarmony: 0.15,
  textureContrast: 0.10,
  formalityCoherence: 0.12,
  vibeAffinity: 0.13,
  colorDepth: 0.08,
  materialCompat: 0.07,
  contextFit: 0.23,
};

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

function scoreVibeAffinity(items: Record<string, Product>, vibe?: string, look?: string): number {
  if (!vibe) return 50;

  const coreKeys = ['outer', 'mid', 'top', 'bottom', 'shoes'];
  const coreItems = coreKeys.map(k => items[k]).filter(Boolean) as Product[];
  if (coreItems.length < 2) return 50;

  const affinities = coreItems.map(p => getVibeItemAffinity(p, vibe));
  const avgAffinity = affinities.reduce((s, a) => s + a, 0) / affinities.length;
  const highCount = affinities.filter(a => a >= 0.5).length;

  let score = 50 + avgAffinity * 40;
  if (highCount >= coreItems.length * 0.6) score += 10;
  if (highCount >= coreItems.length * 0.8) score += 5;

  if (look) {
    const lookKey = look as LookKey;
    const lookScores = coreItems.map(p => getLookAffinityScore(p, vibe, lookKey));
    const avgLookScore = lookScores.reduce((s, a) => s + a, 0) / lookScores.length;
    const lookHighCount = lookScores.filter(s => s >= 0.5).length;

    score += avgLookScore * 15;
    if (lookHighCount >= coreItems.length * 0.6) score += 5;
  }

  const vibeArrays = coreItems.map(p => p.vibe || []).filter(v => v.length > 0);
  if (vibeArrays.length >= 2) {
    let totalCompat = 0;
    let compatCount = 0;
    for (let i = 0; i < vibeArrays.length; i++) {
      for (let j = i + 1; j < vibeArrays.length; j++) {
        let bestCompat = 0;
        for (const v1 of vibeArrays[i]) {
          for (const v2 of vibeArrays[j]) {
            const dist = getVibeDistance(v1, v2);
            bestCompat = Math.max(bestCompat, [100, 85, 65, 40, 20][Math.min(dist, 4)]);
          }
        }
        totalCompat += bestCompat;
        compatCount++;
      }
    }
    if (compatCount > 0) {
      const avgCompat = totalCompat / compatCount;
      score += (avgCompat - 60) * 0.2;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function scoreMaterialCompat(items: Record<string, Product>): number {
  const coreKeys = ['outer', 'mid', 'top', 'bottom', 'shoes'];
  const coreItems = coreKeys.map(k => items[k]).filter(Boolean) as Product[];

  if (coreItems.length < 2) return 50;

  const groups = coreItems.map(p => inferMaterialGroup(p.material || '', p.name));

  let compatTotal = 0;
  let compatCount = 0;
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      compatTotal += getMaterialCompatScore(groups[i], groups[j]);
      compatCount++;
    }
  }
  const avgCompat = compatCount > 0 ? compatTotal / compatCount : 0.5;

  return Math.max(0, Math.min(100, Math.round(avgCompat * 100)));
}

function scoreColorDepth(items: Record<string, Product>): number {
  const coreKeys = ['outer', 'mid', 'top', 'bottom', 'shoes'];
  const colors = coreKeys
    .map(k => items[k])
    .filter(Boolean)
    .map(p => resolveColorFamily(p!.color || '', p!.color_family))
    .filter(Boolean);

  if (colors.length < 3) return 50;

  const analysis = analyzeColorComposition(colors);

  let score = 70;

  if (analysis.accentCount <= 1 && analysis.neutralRatio >= 0.4) score += 20;
  if (analysis.accentCount === 2) score += 8;
  if (analysis.accentCount > 2) score -= 15;

  const uniqueColors = new Set(colors);
  if (uniqueColors.size > 4) score -= 15;
  if (uniqueColors.size === 1 && isNeutralColor(colors[0])) score -= 20;
  if (uniqueColors.size <= 2 && colors.every(c => isNeutralColor(c)) && colors.length >= 4) score -= 15;

  const blackCount = colors.filter(c => c === 'black').length;
  if (blackCount >= 3) score -= 15;
  if (blackCount >= 4) score -= 15;

  if (uniqueColors.size >= 2 && !colors.every(c => isNeutralColor(c))) score += 10;

  const colorCounts = new Map<string, number>();
  colors.forEach(c => colorCounts.set(c, (colorCounts.get(c) || 0) + 1));
  const sorted = [...colorCounts.values()].sort((a, b) => b - a);
  if (sorted.length >= 2) {
    const baseRatio = sorted[0] / colors.length;
    if (baseRatio >= 0.4 && baseRatio <= 0.7) score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

export function scoreComposition(
  items: Record<string, Product>,
  context: AssemblyContext
): CompositionScore {
  const vibeDNA = getVibeDNAForContext(context);

  const ruleResult = evaluateAllRules(items, vibeDNA, context.bodyType);
  const ruleMap: Record<string, number> = {};
  for (const v of ruleResult.verdicts) {
    ruleMap[v.ruleName] = v.score;
  }

  const seasonFit = computeSeasonFit(items, context.targetSeason);
  const warmthFit = computeWarmthFit(items, context.targetWarmth, context.targetSeason);
  const patternBalance = computePatternBalance(items);
  const accessoryHarmony = computeAccessoryHarmony(items);
  const imageFeature = computeImageFeatureScore(items);

  const contextFit = (
    seasonFit * 0.30 +
    warmthFit * 0.30 +
    patternBalance * 0.15 +
    accessoryHarmony * 0.10 +
    imageFeature * 0.15
  );

  const vibeAffinity = scoreVibeAffinity(items, context.vibe, context.look);
  const colorDepth = scoreColorDepth(items);
  const materialCompat = scoreMaterialCompat(items);

  const breakdown = {
    proportion: ruleMap.proportion ?? 50,
    tonalHarmony: ruleMap.tonalHarmony ?? 50,
    textureContrast: ruleMap.textureContrast ?? 50,
    formalityCoherence: ruleMap.formalityCoherence ?? 50,
    vibeAffinity: Math.round(vibeAffinity),
    colorDepth: Math.round(colorDepth),
    materialCompat: Math.round(materialCompat),
    contextFit: Math.round(contextFit),
  };

  let total = 0;
  total += breakdown.proportion * SCORE_WEIGHTS.proportion;
  total += breakdown.tonalHarmony * SCORE_WEIGHTS.tonalHarmony;
  total += breakdown.textureContrast * SCORE_WEIGHTS.textureContrast;
  total += breakdown.formalityCoherence * SCORE_WEIGHTS.formalityCoherence;
  total += breakdown.vibeAffinity * SCORE_WEIGHTS.vibeAffinity;
  total += breakdown.colorDepth * SCORE_WEIGHTS.colorDepth;
  total += breakdown.materialCompat * SCORE_WEIGHTS.materialCompat;
  total += breakdown.contextFit * SCORE_WEIGHTS.contextFit;

  return {
    total: Math.round(total),
    breakdown,
  };
}
