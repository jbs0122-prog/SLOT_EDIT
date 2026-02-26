import { Product } from '../../../data/outfits';
import { RuleVerdict } from '../types';
import { computeItemDNA } from '../itemDna';
import { VibeDNA } from '../../../data/vibeItems/types';

const STYLE_COMPAT: Record<string, Record<string, number>> = {
  formal:       { formal: 1.0, smart_casual: 0.75, casual: 0.35, sporty: 0.1 },
  smart_casual: { formal: 0.75, smart_casual: 1.0, casual: 0.8, sporty: 0.4 },
  casual:       { formal: 0.35, smart_casual: 0.8, casual: 1.0, sporty: 0.7 },
  sporty:       { formal: 0.1, smart_casual: 0.4, casual: 0.7, sporty: 1.0 },
};

function formalityToStyle(f: number): string {
  if (f >= 7) return 'formal';
  if (f >= 4) return 'smart_casual';
  if (f >= 2) return 'casual';
  return 'sporty';
}

const SUB_CATEGORY_STYLE: Record<string, string> = {
  blazer: 'formal', suit_jacket: 'formal', dress_shirt: 'formal',
  slacks: 'formal', dress_pants: 'formal', pencil_skirt: 'formal',
  trench_coat: 'formal', trench: 'formal',
  oxford: 'formal', loafer: 'formal', heel: 'formal', derby: 'formal',
  necktie: 'formal', bowtie: 'formal', tuxedo_jacket: 'formal',
  blouse: 'smart_casual', cardigan: 'smart_casual', polo: 'smart_casual',
  chino: 'smart_casual', chinos: 'smart_casual', knit: 'smart_casual',
  shirt: 'smart_casual', turtleneck: 'smart_casual', sweater: 'smart_casual',
  coat: 'smart_casual', boot: 'smart_casual', tote: 'smart_casual',
  t_shirt: 'casual', tshirt: 'casual', hoodie: 'casual', sweatshirt: 'casual',
  denim_jacket: 'casual', jeans: 'casual', denim: 'casual', jogger: 'casual',
  shorts: 'casual', cargo: 'casual', sneaker: 'casual', sandal: 'casual',
  backpack: 'casual', cap: 'casual', beanie: 'casual',
  track_jacket: 'sporty', windbreaker: 'sporty', puffer: 'sporty',
  legging: 'sporty', leggings: 'sporty', track_pants: 'sporty',
  running_shoe: 'sporty', training_shoe: 'sporty',
  soccer_jersey: 'sporty', basketball_jersey: 'sporty',
};

function inferStyle(product: Product): string {
  const sub = (product.sub_category || '').toLowerCase().replace(/[\s-]/g, '_');
  if (SUB_CATEGORY_STYLE[sub]) return SUB_CATEGORY_STYLE[sub];

  const name = (product.name || '').toLowerCase();
  for (const [cat, style] of Object.entries(SUB_CATEGORY_STYLE)) {
    if (name.includes(cat.replace(/_/g, ' ')) || name.includes(cat)) return style;
  }

  const dna = computeItemDNA(product);
  return formalityToStyle(dna.formality);
}

export function evaluateFormalityCoherenceRule(
  items: Record<string, Product>,
  vibeDNA?: VibeDNA
): RuleVerdict {
  const all = Object.values(items).filter(Boolean);
  if (all.length < 3) {
    return { ruleName: 'formalityCoherence', pass: true, score: 50, penalty: 0, detail: 'insufficient items' };
  }

  const formalities = all.map(p => computeItemDNA(p).formality);
  const styles = all.map(p => inferStyle(p));

  let score = 70;

  const fRange = Math.max(...formalities) - Math.min(...formalities);
  if (fRange <= 2) score += 15;
  else if (fRange <= 3) score += 5;
  else if (fRange > 5) score -= 20;
  else if (fRange > 4) score -= 10;

  let compatSum = 0;
  let compatCount = 0;
  for (let i = 0; i < styles.length; i++) {
    for (let j = i + 1; j < styles.length; j++) {
      compatSum += STYLE_COMPAT[styles[i]]?.[styles[j]] ?? 0.5;
      compatCount++;
    }
  }
  const avgCompat = compatCount > 0 ? compatSum / compatCount : 0.5;
  score += (avgCompat - 0.5) * 40;

  if (vibeDNA?.formality_range) {
    const [fMin, fMax] = vibeDNA.formality_range;
    const avgFormality = formalities.reduce((s, f) => s + f, 0) / formalities.length;
    if (avgFormality >= fMin && avgFormality <= fMax) {
      score += 10;
    } else {
      const overshoot = avgFormality < fMin
        ? fMin - avgFormality
        : avgFormality - fMax;
      score -= overshoot * 6;
    }

    const mixingTolerance = vibeDNA.mixing_tolerance ?? 0.5;
    const normalizedRange = fRange / 10;
    if (normalizedRange > mixingTolerance) {
      score -= (normalizedRange - mixingTolerance) * 25;
    }
  }

  const coreKeys = ['top', 'bottom', 'shoes'];
  const coreStyles = coreKeys.map(k => items[k]).filter(Boolean).map(p => inferStyle(p));
  if (coreStyles.length >= 3) {
    const hasClash = coreStyles.includes('formal') && coreStyles.includes('sporty');
    if (hasClash) score -= 15;
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const pass = finalScore >= 30;

  return {
    ruleName: 'formalityCoherence',
    pass,
    score: finalScore,
    penalty: pass ? 0 : (30 - finalScore) * 0.5,
  };
}

export { STYLE_COMPAT, SUB_CATEGORY_STYLE, inferStyle };
