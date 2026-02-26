import { useState, useMemo } from 'react';
import { Product } from '../data/outfits';
import {
  scoreProductForVibe,
  type VibeCompatScore,
  type ColorTier,
  COLOR_TIER_STYLES,
  COLOR_TIER_LABELS,
} from '../utils/vibeCompatibility';
import { BarChart3, AlertTriangle, Link2, ChevronDown, ChevronUp } from 'lucide-react';

const VIBE_KEYS = [
  'ELEVATED_COOL',
  'EFFORTLESS_NATURAL',
  'ARTISTIC_MINIMAL',
  'RETRO_LUXE',
  'SPORT_MODERN',
  'CREATIVE_LAYERED',
] as const;

const VIBE_LABELS: Record<string, string> = {
  ELEVATED_COOL: 'Elevated Cool',
  EFFORTLESS_NATURAL: 'Effortless Natural',
  ARTISTIC_MINIMAL: 'Artistic Minimal',
  RETRO_LUXE: 'Retro Luxe',
  SPORT_MODERN: 'Sport Modern',
  CREATIVE_LAYERED: 'Creative Layered',
};

interface VibeQualityDashboardProps {
  products: Product[];
  usageCounts: Record<string, number>;
  onFilterUnused?: () => void;
}

interface PairResult {
  a: Product;
  b: Product;
  avgScore: number;
  colorClash: boolean;
  formalityGap: number;
}

export default function VibeQualityDashboard({ products, usageCounts, onFilterUnused }: VibeQualityDashboardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<string>(VIBE_KEYS[0]);
  const [showPairCheck, setShowPairCheck] = useState(false);
  const [pairA, setPairA] = useState<string>('');
  const [pairB, setPairB] = useState<string>('');

  const vibeDistribution = useMemo(() => {
    const dist: Record<string, { total: number; tiers: Record<ColorTier, number>; avgScore: number; scores: number[] }> = {};
    for (const vk of VIBE_KEYS) {
      const tiers: Record<ColorTier, number> = { primary: 0, secondary: 0, accent: 0, outside: 0 };
      const scores: number[] = [];
      for (const p of products) {
        if (!p.vibe?.includes(vk)) continue;
        const s = scoreProductForVibe(p, vk);
        tiers[s.colorTier]++;
        scores.push(s.total);
      }
      const total = scores.length;
      const avgScore = total > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / total) : 0;
      dist[vk] = { total, tiers, avgScore, scores };
    }
    return dist;
  }, [products]);

  const unusedProducts = useMemo(() => {
    return products.filter(p => !usageCounts[p.id] || usageCounts[p.id] === 0);
  }, [products, usageCounts]);

  const selectedVibeProducts = useMemo(() => {
    return products
      .filter(p => p.vibe?.includes(selectedVibe))
      .map(p => ({ ...p, _score: scoreProductForVibe(p, selectedVibe) }))
      .sort((a, b) => b._score.total - a._score.total);
  }, [products, selectedVibe]);

  const lowScoreProducts = useMemo(() => {
    return selectedVibeProducts.filter(p => p._score.total < 50);
  }, [selectedVibeProducts]);

  const pairResult = useMemo((): PairResult | null => {
    if (!pairA || !pairB || pairA === pairB) return null;
    const a = products.find(p => p.id === pairA);
    const b = products.find(p => p.id === pairB);
    if (!a || !b) return null;

    const commonVibes = (a.vibe || []).filter(v => (b.vibe || []).includes(v));
    const vibeToCheck = commonVibes[0] || selectedVibe;

    const scoreA = scoreProductForVibe(a, vibeToCheck);
    const scoreB = scoreProductForVibe(b, vibeToCheck);
    const avgScore = Math.round((scoreA.total + scoreB.total) / 2);

    const outsideTiers: ColorTier[] = ['outside'];
    const colorClash = outsideTiers.includes(scoreA.colorTier) && outsideTiers.includes(scoreB.colorTier);
    const formalityGap = Math.abs((a.formality ?? 3) - (b.formality ?? 3));

    return { a, b, avgScore, colorClash, formalityGap };
  }, [pairA, pairB, products, selectedVibe]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full bg-gradient-to-r from-blue-50 to-teal-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between hover:border-blue-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">Vibe 품질 대시보드</span>
          {unusedProducts.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium">
              <AlertTriangle size={10} />
              미사용 {unusedProducts.length}개
            </span>
          )}
        </div>
        <ChevronDown size={16} className="text-gray-400" />
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(false)}
        className="w-full bg-gradient-to-r from-blue-50 to-teal-50 p-3 flex items-center justify-between hover:from-blue-100 hover:to-teal-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">Vibe 품질 대시보드</span>
        </div>
        <ChevronUp size={16} className="text-gray-400" />
      </button>

      <div className="p-4 space-y-5">
        {/* #15: Vibe Distribution Overview */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Vibe별 제품 분포</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {VIBE_KEYS.map(vk => {
              const d = vibeDistribution[vk];
              const isSelected = vk === selectedVibe;
              const totalTiers = d.tiers.primary + d.tiers.secondary + d.tiers.accent + d.tiers.outside;
              return (
                <button
                  key={vk}
                  onClick={() => setSelectedVibe(vk)}
                  className={`relative rounded-lg p-3 border transition-all text-left ${
                    isSelected
                      ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <p className="text-[10px] font-semibold text-gray-600 truncate">{VIBE_LABELS[vk]}</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{d.total}</p>
                  <p className="text-[10px] text-gray-400">평균 {d.avgScore}점</p>
                  {totalTiers > 0 && (
                    <div className="mt-2 flex h-1.5 rounded-full overflow-hidden bg-gray-200">
                      {d.tiers.primary > 0 && (
                        <div className="bg-emerald-500" style={{ width: `${(d.tiers.primary / totalTiers) * 100}%` }} />
                      )}
                      {d.tiers.secondary > 0 && (
                        <div className="bg-blue-500" style={{ width: `${(d.tiers.secondary / totalTiers) * 100}%` }} />
                      )}
                      {d.tiers.accent > 0 && (
                        <div className="bg-amber-500" style={{ width: `${(d.tiers.accent / totalTiers) * 100}%` }} />
                      )}
                      {d.tiers.outside > 0 && (
                        <div className="bg-red-400" style={{ width: `${(d.tiers.outside / totalTiers) * 100}%` }} />
                      )}
                    </div>
                  )}
                  <div className="mt-1.5 flex gap-1 flex-wrap">
                    {(['primary', 'secondary', 'accent', 'outside'] as ColorTier[]).map(tier => {
                      if (d.tiers[tier] === 0) return null;
                      return (
                        <span key={tier} className={`text-[8px] px-1 py-0.5 rounded border ${COLOR_TIER_STYLES[tier]}`}>
                          {COLOR_TIER_LABELS[tier]} {d.tiers[tier]}
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Vibe Detail: Low-score products */}
        {lowScoreProducts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-red-700 mb-2">
              {VIBE_LABELS[selectedVibe]} - 낮은 호환성 제품 ({lowScoreProducts.length}개, 50점 미만)
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {lowScoreProducts.slice(0, 10).map(p => (
                <div key={p.id} className="shrink-0 w-20">
                  <div className="w-20 h-20 rounded bg-white border border-red-200 overflow-hidden">
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-0.5" />
                  </div>
                  <p className="text-[9px] text-gray-600 mt-1 truncate">{p.name}</p>
                  <span className="text-[9px] font-bold text-red-600">{p._score.total}점</span>
                </div>
              ))}
              {lowScoreProducts.length > 10 && (
                <div className="shrink-0 w-20 flex items-center justify-center text-xs text-red-400">
                  +{lowScoreProducts.length - 10}개
                </div>
              )}
            </div>
          </div>
        )}

        {/* #16: Unused Products Alert */}
        <div className={`rounded-lg p-3 border ${
          unusedProducts.length > 0
            ? 'bg-amber-50 border-amber-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {unusedProducts.length > 0 ? (
                <AlertTriangle size={14} className="text-amber-600" />
              ) : (
                <Link2 size={14} className="text-green-600" />
              )}
              <span className={`text-xs font-semibold ${
                unusedProducts.length > 0 ? 'text-amber-800' : 'text-green-800'
              }`}>
                {unusedProducts.length > 0
                  ? `미사용 제품 ${unusedProducts.length}개 (코디에 연결되지 않은 제품)`
                  : '모든 제품이 코디에 연결되어 있습니다'}
              </span>
            </div>
            {unusedProducts.length > 0 && onFilterUnused && (
              <button
                onClick={onFilterUnused}
                className="text-[10px] font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded transition-colors"
              >
                미사용만 보기
              </button>
            )}
          </div>
          {unusedProducts.length > 0 && (
            <div className="flex gap-2 overflow-x-auto mt-2 pb-1">
              {unusedProducts.slice(0, 12).map(p => (
                <div key={p.id} className="shrink-0 w-14 h-14 rounded bg-white border border-amber-200 overflow-hidden">
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-0.5" />
                </div>
              ))}
              {unusedProducts.length > 12 && (
                <div className="shrink-0 w-14 h-14 flex items-center justify-center text-[10px] text-amber-500 font-medium">
                  +{unusedProducts.length - 12}
                </div>
              )}
            </div>
          )}
        </div>

        {/* #17: Product Pair Compatibility Check */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <button
            onClick={() => setShowPairCheck(!showPairCheck)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-600"
          >
            <Link2 size={14} />
            제품 페어 호환성 체크
            {showPairCheck ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showPairCheck && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">제품 A</label>
                  <select
                    value={pairA}
                    onChange={e => setPairA(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  >
                    <option value="">선택...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.brand} - {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">제품 B</label>
                  <select
                    value={pairB}
                    onChange={e => setPairB(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  >
                    <option value="">선택...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.brand} - {p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {pairResult && (
                <div className={`rounded-lg p-3 border ${
                  pairResult.avgScore >= 70
                    ? 'bg-emerald-50 border-emerald-200'
                    : pairResult.avgScore >= 50
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded bg-white border overflow-hidden">
                        <img src={pairResult.a.image_url} alt="" className="w-full h-full object-contain p-0.5" />
                      </div>
                      <span className="text-gray-400 text-xs font-bold">+</span>
                      <div className="w-12 h-12 rounded bg-white border overflow-hidden">
                        <img src={pairResult.b.image_url} alt="" className="w-full h-full object-contain p-0.5" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-lg font-bold ${
                          pairResult.avgScore >= 70 ? 'text-emerald-700' :
                          pairResult.avgScore >= 50 ? 'text-blue-700' : 'text-red-700'
                        }`}>
                          {pairResult.avgScore}점
                        </span>
                        <span className="text-[10px] text-gray-500">
                          ({VIBE_LABELS[selectedVibe]} 기준)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {pairResult.colorClash && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 border border-red-200">
                            색상 충돌
                          </span>
                        )}
                        {pairResult.formalityGap > 2 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 border border-amber-200">
                            격식 차이 {pairResult.formalityGap}
                          </span>
                        )}
                        {!pairResult.colorClash && pairResult.formalityGap <= 1 && pairResult.avgScore >= 70 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 border border-emerald-200">
                            좋은 조합
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
