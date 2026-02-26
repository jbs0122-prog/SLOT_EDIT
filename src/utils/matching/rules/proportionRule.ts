import { Product } from '../../../data/outfits';
import { RuleVerdict } from '../types';

const SILHOUETTE_BALANCE: Record<string, string[]> = {
  oversized: ['slim', 'fitted', 'straight', 'tapered'],
  relaxed: ['slim', 'fitted', 'straight', 'tapered'],
  wide: ['fitted', 'slim'],
  fitted: ['wide', 'relaxed', 'oversized', 'straight'],
  slim: ['wide', 'relaxed', 'oversized', 'regular'],
  regular: ['slim', 'fitted', 'wide', 'relaxed', 'oversized'],
  straight: ['fitted', 'slim', 'oversized', 'relaxed'],
  tapered: ['relaxed', 'oversized', 'regular', 'wide'],
};

const BODY_TYPE_PREFS: Record<string, Record<string, string[]>> = {
  slim: {
    top: ['regular', 'relaxed', 'oversized'],
    outer: ['regular', 'relaxed', 'oversized'],
    bottom: ['wide', 'straight', 'relaxed'],
  },
  regular: {
    top: ['regular', 'fitted', 'relaxed'],
    outer: ['regular', 'relaxed'],
    bottom: ['wide', 'straight', 'tapered'],
  },
  'plus-size': {
    top: ['regular', 'relaxed'],
    outer: ['regular', 'relaxed'],
    bottom: ['wide', 'straight', 'relaxed'],
  },
  athletic: {
    top: ['fitted', 'regular'],
    outer: ['regular', 'fitted'],
    bottom: ['wide', 'straight', 'tapered'],
  },
};

export function evaluateProportionRule(
  items: Record<string, Product>,
  bodyType?: string
): RuleVerdict {
  const top = items.top;
  const bottom = items.bottom;
  const outer = items.outer;

  if (!top || !bottom) {
    return { ruleName: 'proportion', pass: true, score: 50, penalty: 0, detail: 'insufficient items' };
  }

  const topSil = top.silhouette || 'regular';
  const bottomSil = bottom.silhouette || 'regular';
  const outerSil = outer?.silhouette || '';

  let score = 60;
  let evaluations = 0;

  const evalPair = (sil1: string, sil2: string, weight: number) => {
    if (!sil1 || !sil2) return;
    evaluations++;
    const goodPairs = SILHOUETTE_BALANCE[sil1];
    if (goodPairs?.includes(sil2)) {
      score += 25 * weight;
      return;
    }
    if (sil1 === sil2) {
      if (sil1 === 'oversized' || sil1 === 'wide') score -= 18 * weight;
      else if (sil1 === 'fitted' || sil1 === 'slim') score -= 5 * weight;
    }
  };

  evalPair(topSil, bottomSil, 1.0);
  if (outerSil) {
    evalPair(outerSil, bottomSil, 0.7);
    evalPair(outerSil, topSil, 0.5);
    if (outerSil === 'oversized' && topSil === 'oversized') score -= 15;
  }

  if (bodyType) {
    const prefs = BODY_TYPE_PREFS[bodyType];
    if (prefs) {
      const checks: [string, string, Product][] = [
        ['top', topSil, top],
        ['bottom', bottomSil, bottom],
      ];
      if (outer) checks.push(['outer', outerSil, outer]);

      for (const [cat, sil] of checks) {
        const preferred = prefs[cat];
        if (!preferred) continue;
        const idx = preferred.indexOf(sil);
        if (idx === 0) score += 12;
        else if (idx === 1) score += 6;
        else if (idx === -1) score -= 8;
      }
    }

    if (bottomSil === 'wide') score += 6;
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const pass = finalScore >= 40;

  return {
    ruleName: 'proportion',
    pass,
    score: finalScore,
    penalty: pass ? 0 : (40 - finalScore) * 0.5,
  };
}
