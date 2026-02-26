import { Product } from '../../../data/outfits';
import { RuleVerdict } from '../types';
import { resolveColorFamily, getColorDNA, getTonalHarmonyScore, getColorHarmonyScore, isNeutralColor, isEarthTone } from '../colorDna';

export function evaluateTonalHarmonyRule(
  items: Record<string, Product>
): RuleVerdict {
  const all = Object.values(items).filter(Boolean);
  if (all.length < 3) {
    return { ruleName: 'tonalHarmony', pass: true, score: 50, penalty: 0, detail: 'insufficient items' };
  }

  const families = all.map(p => resolveColorFamily(p.color || '', p.color_family)).filter(Boolean);
  if (families.length < 2) {
    return { ruleName: 'tonalHarmony', pass: true, score: 50, penalty: 0, detail: 'insufficient color data' };
  }

  const colorDNAs = families.map(f => getColorDNA(f));
  let score = getTonalHarmonyScore(colorDNAs);

  let pairHarmony = 0;
  let pairCount = 0;
  for (let i = 0; i < families.length; i++) {
    for (let j = i + 1; j < families.length; j++) {
      pairHarmony += getColorHarmonyScore(families[i], families[j]);
      pairCount++;
    }
  }
  const avgPairHarmony = pairCount > 0 ? pairHarmony / pairCount : 50;

  score = score * 0.5 + avgPairHarmony * 0.5;

  const neutrals = families.filter(f => isNeutralColor(f));
  const accents = families.filter(f => !isNeutralColor(f) && !isEarthTone(f));
  const uniqueAccents = new Set(accents);
  const totalItems = families.length;

  const accentRatio = accents.length / totalItems;
  if (accentRatio <= 0.10 && neutrals.length >= 2) score += 5;
  else if (accentRatio <= 0.30 && uniqueAccents.size <= 1) score += 3;
  else if (accentRatio > 0.50) score -= 8;
  if (uniqueAccents.size > 2) score -= 12;

  const blackCount = families.filter(f => f === 'black').length;
  if (blackCount >= 4 && families.length >= 5) score -= 15;
  if (blackCount >= 3) score -= 8;

  const uniqueColors = new Set(families);
  if (uniqueColors.size === 1 && isNeutralColor(families[0]) && families.length >= 4) {
    score -= 15;
  }

  const tones = all.map(p => p.color_tone).filter(Boolean);
  if (tones.length >= 2) {
    const warmCount = tones.filter(t => t === 'warm').length;
    const coolCount = tones.filter(t => t === 'cool').length;
    if (warmCount > 0 && coolCount > 0) {
      const mixRatio = Math.min(warmCount, coolCount) / Math.max(warmCount, coolCount);
      if (mixRatio > 0.5) score -= 10;
    }
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const pass = finalScore >= 35;

  return {
    ruleName: 'tonalHarmony',
    pass,
    score: finalScore,
    penalty: pass ? 0 : (35 - finalScore) * 0.6,
  };
}
