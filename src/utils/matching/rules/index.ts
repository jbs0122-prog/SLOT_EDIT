import { Product } from '../../../data/outfits';
import { RuleVerdict } from '../types';
import { VibeDNA } from '../../../data/vibeItems/types';
import { evaluateProportionRule } from './proportionRule';
import { evaluateTonalHarmonyRule } from './tonalHarmonyRule';
import { evaluateTextureContrastRule } from './textureContrastRule';
import { evaluateFormalityCoherenceRule } from './formalityCoherenceRule';

export interface RuleEvaluationResult {
  verdicts: RuleVerdict[];
  compositeScore: number;
  passesHard: boolean;
}

const RULE_WEIGHTS = {
  proportion: 0.25,
  tonalHarmony: 0.30,
  textureContrast: 0.20,
  formalityCoherence: 0.25,
};

export function evaluateAllRules(
  items: Record<string, Product>,
  vibeDNA?: VibeDNA,
  bodyType?: string
): RuleEvaluationResult {
  const verdicts: RuleVerdict[] = [
    evaluateProportionRule(items, bodyType),
    evaluateTonalHarmonyRule(items),
    evaluateTextureContrastRule(items, vibeDNA),
    evaluateFormalityCoherenceRule(items, vibeDNA),
  ];

  let weightedSum = 0;
  let totalWeight = 0;
  let passesHard = true;

  for (const v of verdicts) {
    const weight = RULE_WEIGHTS[v.ruleName as keyof typeof RULE_WEIGHTS] || 0.25;
    weightedSum += v.score * weight;
    totalWeight += weight;
    if (!v.pass) passesHard = false;
  }

  const compositeScore = totalWeight > 0 ? weightedSum / totalWeight : 50;

  return { verdicts, compositeScore, passesHard };
}

export { evaluateProportionRule } from './proportionRule';
export { evaluateTonalHarmonyRule } from './tonalHarmonyRule';
export { evaluateTextureContrastRule } from './textureContrastRule';
export { evaluateFormalityCoherenceRule, STYLE_COMPAT, SUB_CATEGORY_STYLE, inferStyle } from './formalityCoherenceRule';
