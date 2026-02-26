import { Product } from '../../../data/outfits';
import { RuleVerdict } from '../types';
import { computeItemDNA, getMaterialCompatScore, inferMaterialGroup } from '../itemDna';
import { VibeDNA } from '../../../data/vibeItems/types';

export function evaluateTextureContrastRule(
  items: Record<string, Product>,
  vibeDNA?: VibeDNA
): RuleVerdict {
  const coreKeys = ['outer', 'mid', 'top', 'bottom', 'shoes'];
  const coreItems = coreKeys.map(k => items[k]).filter(Boolean) as Product[];

  if (coreItems.length < 2) {
    return { ruleName: 'textureContrast', pass: true, score: 50, penalty: 0, detail: 'insufficient items' };
  }

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

  let score = avgCompat * 80;

  const uniqueGroups = new Set(groups);
  const variety = uniqueGroups.size;
  const requiredVariety = vibeDNA?.texture_rules?.required_variety ?? 2;

  if (variety >= requiredVariety) score += 12;
  else if (variety < requiredVariety) score -= 8;

  if (variety >= 3) score += 5;
  if (variety === 1 && coreItems.length >= 3) score -= 10;

  if (vibeDNA?.texture_rules) {
    const preferred = vibeDNA.texture_rules.preferred_textures;
    const dnas = coreItems.map(p => computeItemDNA(p));

    let preferredCount = 0;
    for (const dna of dnas) {
      if (preferred.includes(dna.textureProfile.label)) preferredCount++;
    }

    const preferredRatio = preferredCount / dnas.length;
    if (preferredRatio >= 0.6) score += 10;
    else if (preferredRatio >= 0.3) score += 4;

    const sheenTolerance = vibeDNA.texture_rules.sheen_tolerance;
    const avgSheen = dnas.reduce((s, d) => s + d.textureProfile.sheenLevel, 0) / dnas.length;
    if (avgSheen > sheenTolerance) score -= (avgSheen - sheenTolerance) * 20;

    const forbidden = vibeDNA.texture_rules.forbidden_textures || [];
    for (const dna of dnas) {
      if (forbidden.includes(dna.textureProfile.label)) score -= 15;
    }
  }

  if (vibeDNA?.material_preferences) {
    let matchCount = 0;
    for (const g of groups) {
      if (vibeDNA.material_preferences.includes(g)) matchCount++;
    }
    const matchRatio = matchCount / groups.length;
    if (matchRatio >= 0.5) score += 8;
    else if (matchRatio < 0.2) score -= 5;
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const pass = finalScore >= 30;

  return {
    ruleName: 'textureContrast',
    pass,
    score: finalScore,
    penalty: pass ? 0 : (30 - finalScore) * 0.4,
  };
}
