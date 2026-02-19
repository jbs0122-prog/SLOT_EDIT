import { useState, useRef, useCallback } from 'react';
import {
  Camera, Search, Sparkles, Check, Star, ExternalLink,
  Loader2, AlertCircle, Tag, Eye, Zap, ChevronDown,
  ChevronUp, ImageIcon, ArrowRight, X, Square, RefreshCw
} from 'lucide-react';
import { supabase } from '../utils/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface SmartResult {
  asin: string;
  title: string;
  brand: string;
  price: number | null;
  currency: string;
  image: string;
  rating: number | null;
  reviews_count: number | null;
  url: string;
  is_prime: boolean;
  source: 'lens' | 'keyword';
  analyzed?: AnalyzedData;
  analyzing?: boolean;
  analyzeError?: string;
}

interface AnalyzedData {
  brand: string;
  name: string;
  category: string;
  sub_category: string;
  gender: string;
  color: string;
  color_family: string;
  color_tone: string;
  silhouette: string;
  material: string;
  pattern: string;
  vibe: string[];
  body_type: string[];
  season: string[];
  formality: number;
  warmth: number;
  stock_status: string;
  image_url: string;
  product_link: string;
  price: number | null;
}

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Men' },
  { value: 'FEMALE', label: 'Women' },
  { value: 'UNISEX', label: 'Unisex' },
];

const BODY_TYPE_OPTIONS = [
  { value: 'slim', label: 'Slim' },
  { value: 'regular', label: 'Regular' },
  { value: 'plus-size', label: 'Plus-size' },
];

const VIBE_OPTIONS = [
  { value: 'ELEVATED_COOL', label: 'Elevated Cool' },
  { value: 'EFFORTLESS_NATURAL', label: 'Effortless Natural' },
  { value: 'ARTISTIC_MINIMAL', label: 'Artistic Minimal' },
  { value: 'RETRO_LUXE', label: 'Retro Luxe' },
  { value: 'SPORT_MODERN', label: 'Sport Modern' },
  { value: 'CREATIVE_LAYERED', label: 'Creative Layered' },
];

const SEASON_OPTIONS = [
  { value: 'spring', label: 'Spring' },
  { value: 'summer', label: 'Summer' },
  { value: 'fall', label: 'Fall' },
  { value: 'winter', label: 'Winter' },
];

const CATEGORY_COLORS: Record<string, string> = {
  outer: 'bg-blue-500/15 text-blue-400',
  mid: 'bg-sky-500/15 text-sky-400',
  top: 'bg-emerald-500/15 text-emerald-400',
  bottom: 'bg-amber-500/15 text-amber-400',
  shoes: 'bg-orange-500/15 text-orange-400',
  bag: 'bg-rose-500/15 text-rose-400',
  accessory: 'bg-white/10 text-white/50',
};

type SearchPhase = 'idle' | 'lens_searching' | 'generating_keywords' | 'keyword_searching' | 'done';

export default function AdminSmartSearch() {
  const [imageUrl, setImageUrl] = useState('');
  const [gender, setGender] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [vibe, setVibe] = useState('');
  const [season, setSeason] = useState('');

  const [phase, setPhase] = useState<SearchPhase>('idle');
  const [results, setResults] = useState<SmartResult[]>([]);
  const [searchLog, setSearchLog] = useState<string[]>([]);
  const [showLog, setShowLog] = useState(true);

  const [lensCount, setLensCount] = useState(0);
  const [keywordCount, setKeywordCount] = useState(0);
  const [allVisualMatches, setAllVisualMatches] = useState(0);
  const [usedKeywords, setUsedKeywords] = useState<string[]>([]);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [savedAsins, setSavedAsins] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 });

  const [manualKeyword, setManualKeyword] = useState('');
  const [manualSearching, setManualSearching] = useState(false);

  const [showFilters, setShowFilters] = useState(true);

  const abortRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    setSearchLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const runSmartSearch = async () => {
    if (!imageUrl.trim()) return;

    abortRef.current = false;
    setPhase('lens_searching');
    setResults([]);
    setSearchLog([]);
    setSearchError('');
    setSelected(new Set());
    setLensCount(0);
    setKeywordCount(0);
    setAllVisualMatches(0);
    setUsedKeywords([]);
    setFallbackUsed(false);
    setShowLog(true);

    addLog('Google Lens 이미지 검색 시작...');

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/smart-product-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          action: 'smart_search',
          image_url: imageUrl.trim(),
          gender,
          body_type: bodyType,
          vibe,
          season,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      if (data.lens_error) {
        addLog(`Lens 검색 실패: ${data.lens_error}`);
      } else {
        addLog(`Lens 검색 완료: 시각적 매칭 ${data.all_visual_matches}개, Amazon 상품 ${data.lens_count}개`);
      }

      if (data.fallback_used) {
        setPhase('generating_keywords');
        addLog('Lens 결과 부족 -> AI 키워드 fallback 실행...');

        if (data.keyword_error) {
          addLog(`키워드 검색 실패: ${data.keyword_error}`);
        } else {
          addLog(`AI 키워드로 ${data.keyword_count}개 추가 상품 발견`);
          if (data.used_keywords?.length > 0) {
            addLog(`사용된 키워드: ${data.used_keywords.join(', ')}`);
          }
        }
      }

      setLensCount(data.lens_count || 0);
      setKeywordCount(data.keyword_count || 0);
      setAllVisualMatches(data.all_visual_matches || 0);
      setUsedKeywords(data.used_keywords || []);
      setFallbackUsed(data.fallback_used || false);

      const mergedResults: SmartResult[] = (data.results || []).map((r: SmartResult) => ({ ...r }));
      setResults(mergedResults);

      addLog(`완료! 총 ${mergedResults.length}개 Amazon 상품`);
      setPhase('done');
    } catch (err) {
      setSearchError((err as Error).message);
      addLog(`오류: ${(err as Error).message}`);
      setPhase('done');
    }
  };

  const runManualKeywordSearch = async () => {
    if (!manualKeyword.trim()) return;
    setManualSearching(true);
    addLog(`수동 키워드 검색: "${manualKeyword}"`);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/smart-product-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          action: 'keyword_search',
          keyword: manualKeyword.trim(),
          page: 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const newResults: SmartResult[] = (data.results || []).map((r: SmartResult) => ({ ...r }));
      const existingAsins = new Set(results.map(r => r.asin));
      const deduplicated = newResults.filter(r => r.asin && !existingAsins.has(r.asin));

      setResults(prev => [...prev, ...deduplicated]);
      setKeywordCount(prev => prev + deduplicated.length);
      addLog(`키워드 검색으로 ${deduplicated.length}개 새 상품 추가 (중복 ${newResults.length - deduplicated.length}개 제외)`);
    } catch (err) {
      addLog(`키워드 검색 오류: ${(err as Error).message}`);
    } finally {
      setManualSearching(false);
    }
  };

  const toggleSelect = (asin: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(asin) ? next.delete(asin) : next.add(asin);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const available = results.filter(p => !savedAsins.has(p.asin)).map(p => p.asin);
    const allSelected = available.every(a => selected.has(a)) && available.length > 0;
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        available.forEach(a => next.delete(a));
        return next;
      });
    } else {
      setSelected(prev => new Set([...prev, ...available]));
    }
  };

  const analyzeAndSave = async () => {
    const toSave = results.filter(p => selected.has(p.asin) && !savedAsins.has(p.asin));
    if (toSave.length === 0) return;

    setSavingAll(true);
    setSaveProgress({ done: 0, total: toSave.length });

    for (let i = 0; i < toSave.length; i++) {
      if (abortRef.current) break;
      const product = toSave[i];

      setResults(prev =>
        prev.map(p => p.asin === product.asin ? { ...p, analyzing: true, analyzeError: undefined } : p)
      );

      try {
        const { data, error } = await supabase.functions.invoke('analyze-amazon-product', {
          body: { product, gender, body_type: bodyType, vibe, season },
        });

        if (error) {
          const msg = data?.error || error.message || 'Edge function error';
          throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
        if (!data) throw new Error('Empty response');
        if (data.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));

        setResults(prev =>
          prev.map(p => p.asin === product.asin ? { ...p, analyzing: false, analyzed: data.result } : p)
        );
        setSavedAsins(prev => new Set([...prev, product.asin]));
        setSelected(prev => { const next = new Set(prev); next.delete(product.asin); return next; });
        addLog(`DB 등록: ${data.result.name?.slice(0, 40)}...`);
      } catch (err) {
        setResults(prev =>
          prev.map(p => p.asin === product.asin
            ? { ...p, analyzing: false, analyzeError: (err as Error).message }
            : p
          )
        );
        addLog(`등록 실패: ${(err as Error).message.slice(0, 50)}`);
      }

      setSaveProgress(prev => ({ ...prev, done: i + 1 }));
    }

    setSavingAll(false);
  };

  const isSearching = phase !== 'idle' && phase !== 'done';
  const selectedCount = selected.size;
  const availableCount = results.filter(p => !savedAsins.has(p.asin)).length;
  const allSelected = availableCount > 0 && selected.size === availableCount;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex">
      {/* Left Panel */}
      <div className="w-80 shrink-0 border-r border-white/8 bg-[#141414] flex flex-col">
        <div className="p-5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <Camera className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Smart Search</h2>
              <p className="text-white/30 text-[10px]">Image + AI Keyword</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Image URL Input */}
          <div>
            <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">
              Product Image URL <span className="text-teal-400">*</span>
            </label>
            <div className="relative">
              <input
                type="url"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://example.com/product.jpg"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
              />
              {imageUrl && (
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {imageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-white/5">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-40 object-contain bg-white"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-between w-full text-[10px] font-semibold text-white/40 uppercase tracking-widest"
          >
            <span>Context Filters</span>
            {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showFilters && (
            <div className="space-y-4">
              {/* Gender */}
              <div>
                <label className="block text-[10px] font-semibold text-white/30 mb-2">Gender</label>
                <div className="flex gap-1.5">
                  {GENDER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setGender(prev => prev === opt.value ? '' : opt.value)}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-xs transition-all ${
                        gender === opt.value
                          ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
                          : 'text-white/40 hover:text-white/60 bg-white/3 border border-transparent hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Type */}
              <div>
                <label className="block text-[10px] font-semibold text-white/30 mb-2">Body Type</label>
                <div className="flex gap-1.5">
                  {BODY_TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setBodyType(prev => prev === opt.value ? '' : opt.value)}
                      className={`flex-1 px-2 py-1.5 rounded-lg text-xs transition-all ${
                        bodyType === opt.value
                          ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
                          : 'text-white/40 hover:text-white/60 bg-white/3 border border-transparent hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vibe */}
              <div>
                <label className="block text-[10px] font-semibold text-white/30 mb-2">Style Vibe</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {VIBE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setVibe(prev => prev === opt.value ? '' : opt.value)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] transition-all text-left ${
                        vibe === opt.value
                          ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
                          : 'text-white/40 hover:text-white/60 bg-white/3 border border-transparent hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Season */}
              <div>
                <label className="block text-[10px] font-semibold text-white/30 mb-2">Season</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SEASON_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSeason(prev => prev === opt.value ? '' : opt.value)}
                      className={`px-2 py-1.5 rounded-lg text-xs transition-all ${
                        season === opt.value
                          ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40'
                          : 'text-white/40 hover:text-white/60 bg-white/3 border border-transparent hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="p-5 border-t border-white/8 space-y-2.5">
          <button
            onClick={runSmartSearch}
            disabled={!imageUrl.trim() || isSearching}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all text-sm shadow-lg shadow-teal-500/20"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {isSearching ? 'Smart Search 진행 중...' : 'Smart Search 실행'}
          </button>
          {!imageUrl.trim() && (
            <p className="text-white/20 text-xs text-center">이미지 URL을 입력하세요</p>
          )}
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Status Badges */}
        {phase !== 'idle' && (
          <div className="border-b border-white/8 px-6 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <SearchPhaseBadge phase={phase} />

              {phase === 'done' && (
                <>
                  <div className="flex items-center gap-1.5 bg-teal-500/10 text-teal-400 px-3 py-1 rounded-full text-xs font-medium">
                    <Eye className="w-3.5 h-3.5" />
                    Lens: {lensCount}
                    {allVisualMatches > 0 && (
                      <span className="text-teal-400/50">({allVisualMatches} visual)</span>
                    )}
                  </div>
                  {fallbackUsed && (
                    <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-3 py-1 rounded-full text-xs font-medium">
                      <Sparkles className="w-3.5 h-3.5" />
                      Keyword Fallback: +{keywordCount}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 bg-white/5 text-white/50 px-3 py-1 rounded-full text-xs">
                    Total: {results.length}
                  </div>
                </>
              )}
            </div>

            {/* Used Keywords */}
            {usedKeywords.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-white/25 uppercase tracking-wider">AI Keywords:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {usedKeywords.map((kw, i) => (
                    <span key={i} className="text-[11px] bg-amber-500/10 text-amber-400/70 px-2 py-0.5 rounded-full">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Log */}
        {searchLog.length > 0 && (
          <div className="border-b border-white/8">
            <button
              onClick={() => setShowLog(!showLog)}
              className="w-full flex items-center justify-between px-6 py-2 text-[10px] text-white/25 uppercase tracking-wider hover:text-white/40 transition-colors"
            >
              <span>Search Log ({searchLog.length})</span>
              {showLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showLog && (
              <div className="px-6 pb-3 max-h-32 overflow-y-auto space-y-0.5">
                {searchLog.map((line, i) => (
                  <p key={i} className={`text-[11px] font-mono ${
                    line.includes('완료') || line.includes('DB 등록') ? 'text-emerald-400/70' :
                    line.includes('실패') || line.includes('오류') ? 'text-red-400/70' :
                    line.includes('fallback') || line.includes('키워드') ? 'text-amber-400/60' :
                    'text-white/30'
                  }`}>
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Manual Keyword Search */}
        {phase === 'done' && (
          <div className="border-b border-white/8 px-6 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/25 uppercase tracking-wider shrink-0">추가 키워드:</span>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={manualKeyword}
                  onChange={e => setManualKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runManualKeywordSearch()}
                  placeholder="수동 키워드로 추가 검색..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-teal-500/40 transition-all"
                />
                <button
                  onClick={runManualKeywordSearch}
                  disabled={!manualKeyword.trim() || manualSearching}
                  className="flex items-center gap-1.5 bg-white/8 hover:bg-white/15 disabled:opacity-30 text-white/60 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                >
                  {manualSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  검색
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Bar */}
        {results.length > 0 && (
          <div className="border-b border-white/8 px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  allSelected
                    ? 'bg-teal-500 border-teal-500'
                    : selectedCount > 0
                    ? 'bg-teal-500/40 border-teal-500/60'
                    : 'border-white/20'
                }`}>
                  {allSelected && <Check className="w-3 h-3 text-white" />}
                  {!allSelected && selectedCount > 0 && <Square className="w-2 h-2 text-teal-400 fill-teal-400" />}
                </div>
                전체 선택
              </button>
              {selectedCount > 0 && (
                <span className="text-xs text-teal-400 font-medium">{selectedCount}개 선택됨</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {savingAll && (
                <span className="text-xs text-white/40">
                  {saveProgress.done}/{saveProgress.total} 처리 중...
                </span>
              )}
              <button
                onClick={analyzeAndSave}
                disabled={selectedCount === 0 || savingAll}
                className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all"
              >
                {savingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Tag className="w-4 h-4" />
                )}
                {savingAll ? 'AI 분석 & 등록 중...' : `${selectedCount}개 AI 분석 & DB 등록`}
              </button>
            </div>
          </div>
        )}

        {/* Results Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {phase === 'idle' && (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 flex items-center justify-center mx-auto mb-5 border border-teal-500/10">
                  <Camera className="w-10 h-10 text-teal-500/30" />
                </div>
                <p className="text-white/40 text-base font-medium mb-2">Smart Product Search</p>
                <p className="text-white/20 text-sm max-w-md mx-auto leading-relaxed">
                  상품 이미지 URL을 입력하면 Google Lens로 시각적 유사 상품을 찾고,
                  결과가 부족하면 AI 키워드로 자동 보완합니다.
                </p>
                <div className="flex items-center justify-center gap-6 mt-6">
                  <StepIndicator step={1} label="이미지 검색" icon={<Eye className="w-4 h-4" />} />
                  <ArrowRight className="w-4 h-4 text-white/10" />
                  <StepIndicator step={2} label="AI 키워드 Fallback" icon={<Sparkles className="w-4 h-4" />} />
                  <ArrowRight className="w-4 h-4 text-white/10" />
                  <StepIndicator step={3} label="AI 분석 & DB 등록" icon={<Tag className="w-4 h-4" />} />
                </div>
              </div>
            </div>
          )}

          {isSearching && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-teal-500 animate-ping" />
              </div>
              <p className="text-white/50 text-sm mt-4 font-medium">
                {phase === 'lens_searching' && 'Google Lens로 이미지 분석 중...'}
                {phase === 'generating_keywords' && 'AI 키워드 생성 중...'}
                {phase === 'keyword_searching' && 'Amazon 키워드 검색 중...'}
              </p>
            </div>
          )}

          {searchError && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">{searchError}</p>
            </div>
          )}

          {!isSearching && results.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {results.map(product => {
                const isSaved = savedAsins.has(product.asin);
                const isSelected = selected.has(product.asin);
                const isAnalyzing = product.analyzing;

                return (
                  <div
                    key={product.asin}
                    onClick={() => !isSaved && !isAnalyzing && toggleSelect(product.asin)}
                    className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer ${
                      isSaved
                        ? 'border-emerald-500/30 bg-emerald-500/5 cursor-default'
                        : isSelected
                        ? 'border-teal-500/60 bg-teal-500/8 ring-2 ring-teal-500/20'
                        : 'border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/6'
                    }`}
                  >
                    {/* Source badge */}
                    <div className={`absolute top-2 right-2 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      product.source === 'lens'
                        ? 'bg-teal-500/80 text-white'
                        : 'bg-amber-500/80 text-white'
                    }`}>
                      {product.source === 'lens' ? 'LENS' : 'KW'}
                    </div>

                    {/* Checkbox */}
                    <div className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      isSaved
                        ? 'bg-emerald-500 border-emerald-500'
                        : isSelected
                        ? 'bg-teal-500 border-teal-500'
                        : 'bg-black/40 border-white/20 group-hover:border-white/40'
                    }`}>
                      {isSaved && <Check className="w-3 h-3 text-white" />}
                      {isSelected && !isSaved && <Check className="w-3 h-3 text-white" />}
                    </div>

                    {isAnalyzing && (
                      <div className="absolute inset-0 z-20 bg-black/60 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
                        <span className="text-xs text-teal-400 font-medium">AI 분석 중...</span>
                      </div>
                    )}

                    {product.analyzeError && (
                      <div className="absolute inset-0 z-20 bg-red-900/60 flex flex-col items-center justify-center gap-1 p-2">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <span className="text-[10px] text-red-300 text-center leading-tight">
                          {product.analyzeError.slice(0, 60)}
                        </span>
                      </div>
                    )}

                    <div className="aspect-square bg-white overflow-hidden">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-full h-full object-contain p-2"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    <div className="p-2.5">
                      <p className="text-white/70 text-[11px] leading-snug line-clamp-2 mb-1.5 min-h-[2.5em]">
                        {product.title}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold text-xs ${isSaved ? 'text-emerald-400' : 'text-teal-400'}`}>
                          {isSaved ? '등록됨' : product.price != null ? `$${Number(product.price).toFixed(2)}` : '-'}
                        </span>
                        {product.rating != null && (
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-white/35 text-[10px]">{product.rating}</span>
                          </div>
                        )}
                      </div>

                      {product.analyzed && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[product.analyzed.category] || 'bg-white/8 text-white/40'}`}>
                            {product.analyzed.category}
                          </span>
                          {product.analyzed.silhouette && (
                            <span className="text-[9px] bg-white/8 text-white/35 px-1.5 py-0.5 rounded">
                              {product.analyzed.silhouette}
                            </span>
                          )}
                          {product.analyzed.color_family && (
                            <span className="text-[9px] bg-white/8 text-white/35 px-1.5 py-0.5 rounded">
                              {product.analyzed.color_family}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="absolute bottom-2 right-2 z-10 w-6 h-6 bg-black/40 hover:bg-black/70 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <ExternalLink className="w-3 h-3 text-white/60" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}

          {phase === 'done' && results.length === 0 && !searchError && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="w-12 h-12 text-white/10 mb-3" />
              <p className="text-white/30 text-sm">검색 결과가 없습니다</p>
              <p className="text-white/15 text-xs mt-1">다른 이미지 URL을 시도해보세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchPhaseBadge({ phase }: { phase: SearchPhase }) {
  if (phase === 'idle') return null;

  const config = {
    lens_searching: { label: 'Lens 검색 중...', color: 'bg-teal-500/15 text-teal-400', spinning: true },
    generating_keywords: { label: 'AI 키워드 생성 중...', color: 'bg-amber-500/15 text-amber-400', spinning: true },
    keyword_searching: { label: '키워드 검색 중...', color: 'bg-amber-500/15 text-amber-400', spinning: true },
    done: { label: 'Search Complete', color: 'bg-emerald-500/15 text-emerald-400', spinning: false },
  }[phase];

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.spinning && <Loader2 className="w-3 h-3 animate-spin" />}
      {!config.spinning && <Check className="w-3 h-3" />}
      {config.label}
    </div>
  );
}

function StepIndicator({ step, label, icon }: { step: number; label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white/25">
        {icon}
      </div>
      <span className="text-[10px] text-white/25">{label}</span>
    </div>
  );
}
