import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ShoppingBag, Search, Sparkles, Check, Star, ExternalLink,
  ChevronLeft, ChevronRight, Loader2, AlertCircle, Tag,
  RefreshCw, Filter, Zap, Square, Play, Pause
} from 'lucide-react';
import { supabase } from '../utils/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SESSION_KEY = 'adminAmazonSearch_state';

interface AmazonProduct {
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
}

interface AnalyzedProduct extends AmazonProduct {
  analyzed?: {
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
  };
  analyzing?: boolean;
  analyzeError?: string;
}

type Step = 'filter' | 'results';

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

const CATEGORY_TABS = [
  { value: 'all', label: '전체' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'outer', label: 'Outer' },
  { value: 'mid', label: 'Mid' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'bag', label: 'Bag' },
  { value: 'accessory', label: 'Accessory' },
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

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function AdminAmazonSearch() {
  const saved = loadSession();

  const [step, setStep] = useState<Step>(saved?.step || 'filter');

  const [gender, setGender] = useState(saved?.gender || '');
  const [bodyType, setBodyType] = useState(saved?.bodyType || '');
  const [vibe, setVibe] = useState(saved?.vibe || '');
  const [season, setSeason] = useState(saved?.season || '');

  const [keywords, setKeywords] = useState<string[]>(saved?.keywords || []);
  const [keywordCategories, setKeywordCategories] = useState<Record<string, string[]>>(saved?.keywordCategories || {});
  const [activeKeywordCategory, setActiveKeywordCategory] = useState<string>(saved?.activeKeywordCategory || 'all');
  const [keywordsSource, setKeywordsSource] = useState<'gemini' | 'fallback' | ''>(saved?.keywordsSource || '');
  const [generatingKeywords, setGeneratingKeywords] = useState(false);
  const [keywordsError, setKeywordsError] = useState('');

  const [activeKeyword, setActiveKeyword] = useState(saved?.activeKeyword || '');
  const [products, setProducts] = useState<AnalyzedProduct[]>(saved?.products || []);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [page, setPage] = useState(saved?.page || 1);
  const [total, setTotal] = useState(saved?.total || 0);
  const [categoryFilter, setCategoryFilter] = useState(saved?.categoryFilter || 'all');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [savedAsins, setSavedAsins] = useState<Set<string>>(new Set(saved?.savedAsins || []));
  const [savingAll, setSavingAll] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0, keyword: '' });
  const [sortBy, setSortBy] = useState<'default' | 'rating' | 'reviews'>(saved?.sortBy || 'default');

  const [filtersChanged, setFiltersChanged] = useState(false);
  const savedFiltersRef = useRef({ gender: saved?.gender || '', bodyType: saved?.bodyType || '', vibe: saved?.vibe || '', season: saved?.season || '' });

  // Auto mode
  const [autoMode, setAutoMode] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoLog, setAutoLog] = useState<string[]>([]);
  const [autoSavedCount, setAutoSavedCount] = useState(0);
  const autoAbortRef = useRef(false);

  useEffect(() => {
    const hasKeywords = keywords.length > 0;
    const changed = hasKeywords && (
      gender !== savedFiltersRef.current.gender ||
      bodyType !== savedFiltersRef.current.bodyType ||
      vibe !== savedFiltersRef.current.vibe ||
      season !== savedFiltersRef.current.season
    );
    setFiltersChanged(changed);
  }, [gender, bodyType, vibe, season, keywords]);

  useEffect(() => {
    if (generatingKeywords || autoRunning) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        step,
        gender,
        bodyType,
        vibe,
        season,
        keywords,
        keywordCategories,
        activeKeywordCategory,
        keywordsSource,
        activeKeyword,
        products: products.map(p => ({ ...p, analyzing: false, analyzeError: undefined })),
        page,
        total,
        categoryFilter,
        savedAsins: [...savedAsins],
        sortBy,
      }));
    } catch { /* ignore */ }
  }, [step, gender, bodyType, vibe, season, keywords, keywordCategories, activeKeywordCategory, keywordsSource, activeKeyword, products, page, total, categoryFilter, savedAsins, sortBy, generatingKeywords, autoRunning]);

  const canGenerate = gender && vibe;

  const generateKeywords = async () => {
    if (!canGenerate) return;
    setGeneratingKeywords(true);
    setKeywordsError('');
    setKeywords([]);
    setKeywordCategories({});
    setActiveKeywordCategory('all');
    setKeywordsSource('');
    setProducts([]);
    setSelected(new Set());
    setActiveKeyword('');
    setCategoryFilter('all');
    setFiltersChanged(false);
    savedFiltersRef.current = { gender, bodyType, vibe, season };
    setStep('results');

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-amazon-keywords`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ gender, body_type: bodyType, vibe, season }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.error) throw new Error(data.error);
      setKeywords(data.keywords || []);
      setKeywordCategories(data.categories || {});
      setKeywordsSource(data.source || 'fallback');
    } catch (err) {
      setKeywordsError((err as Error).message);
    } finally {
      setGeneratingKeywords(false);
    }
  };

  const searchByKeyword = useCallback(async (kw: string, p = 1) => {
    const isNewKeyword = kw !== activeKeyword;
    setActiveKeyword(kw);
    setSearchLoading(true);
    setSearchError('');
    setPage(p);
    setProducts([]);
    setSelected(new Set());
    setCategoryFilter('all');
    if (isNewKeyword) setSortBy('default');

    try {
      const { data, error } = await supabase.functions.invoke('amazon-search', {
        body: { query: kw, page: p },
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
      setProducts((data.results || []).map((r: AmazonProduct) => ({ ...r })));
      setTotal(data.total || 0);
    } catch (err) {
      setSearchError((err as Error).message);
    } finally {
      setSearchLoading(false);
    }
  }, [activeKeyword]);

  const toggleSelect = (asin: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(asin) ? next.delete(asin) : next.add(asin);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visible = filteredProducts.filter(p => !savedAsins.has(p.asin)).map(p => p.asin);
    const allSelected = visible.every(a => selected.has(a)) && visible.length > 0;
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        visible.forEach(a => next.delete(a));
        return next;
      });
    } else {
      setSelected(prev => new Set([...prev, ...visible]));
    }
  };

  const analyzeAndSave = async () => {
    const toSave = products.filter(p => selected.has(p.asin) && !savedAsins.has(p.asin));
    if (toSave.length === 0) return;

    setSavingAll(true);
    setSaveProgress({ done: 0, total: toSave.length, keyword: activeKeyword });

    for (let i = 0; i < toSave.length; i++) {
      const product = toSave[i];

      setProducts(prev =>
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
        if (!data) throw new Error('Empty response from server');
        if (data.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));

        const analyzed = data.result;

        setProducts(prev =>
          prev.map(p => p.asin === product.asin ? { ...p, analyzing: false, analyzed } : p)
        );
        setSavedAsins(prev => new Set([...prev, product.asin]));
        setSelected(prev => { const next = new Set(prev); next.delete(product.asin); return next; });
      } catch (err) {
        setProducts(prev =>
          prev.map(p => p.asin === product.asin
            ? { ...p, analyzing: false, analyzeError: (err as Error).message }
            : p
          )
        );
      }

      setSaveProgress(prev => ({ ...prev, done: i + 1 }));
    }

    setSavingAll(false);
  };

  // Auto mode: for each keyword, search top results, select all, analyze & save
  const runAutoMode = async () => {
    if (keywords.length === 0) return;
    setAutoRunning(true);
    autoAbortRef.current = false;
    setAutoLog([]);
    setAutoSavedCount(0);
    setStep('results');

    let totalSaved = 0;

    for (const kw of keywords) {
      if (autoAbortRef.current) break;
      setAutoLog(prev => [...prev, `검색 중: "${kw}"`]);

      try {
        const { data, error } = await supabase.functions.invoke('amazon-search', {
          body: { query: kw, page: 1 },
        });
        if (error || data.error) {
          setAutoLog(prev => [...prev, `  검색 실패: ${error?.message || data.error}`]);
          continue;
        }

        const results: AmazonProduct[] = (data.results || []).slice(0, 5);
        setAutoLog(prev => [...prev, `  ${results.length}개 상품 발견, AI 분석 시작...`]);
        setActiveKeyword(kw);
        setProducts(results.map(r => ({ ...r })));

        for (const product of results) {
          if (autoAbortRef.current) break;

          setProducts(prev =>
            prev.map(p => p.asin === product.asin ? { ...p, analyzing: true, analyzeError: undefined } : p)
          );

          try {
            const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke(
              'analyze-amazon-product',
              { body: { product, gender, body_type: bodyType, vibe, season } }
            );

            if (analyzeError) {
              const msg = analyzeData?.error || analyzeError.message || 'Edge function error';
              throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
            }
            if (!analyzeData) throw new Error('Empty response from server');
            if (analyzeData.error) throw new Error(typeof analyzeData.error === 'string' ? analyzeData.error : JSON.stringify(analyzeData.error));

            setProducts(prev =>
              prev.map(p => p.asin === product.asin ? { ...p, analyzing: false, analyzed: analyzeData.result } : p)
            );
            setSavedAsins(prev => new Set([...prev, product.asin]));
            totalSaved++;
            setAutoSavedCount(totalSaved);
            setAutoLog(prev => [...prev, `  ✓ 저장: ${analyzeData.result.name.slice(0, 40)}...`]);
          } catch (err) {
            setProducts(prev =>
              prev.map(p => p.asin === product.asin
                ? { ...p, analyzing: false, analyzeError: (err as Error).message }
                : p
              )
            );
            setAutoLog(prev => [...prev, `  ✗ 실패: ${(err as Error).message.slice(0, 50)}`]);
          }
        }
      } catch (err) {
        setAutoLog(prev => [...prev, `  오류: ${(err as Error).message}`]);
      }
    }

    setAutoLog(prev => [...prev, `완료! 총 ${totalSaved}개 상품 등록됨`]);
    setAutoRunning(false);
  };

  const stopAutoMode = () => {
    autoAbortRef.current = true;
  };

  const filteredProducts = (() => {
    const base = categoryFilter === 'all'
      ? products
      : products.filter(p => p.analyzed?.category === categoryFilter);
    if (sortBy === 'rating') {
      return [...base].sort((a, b) => {
        if (a.rating == null && b.rating == null) return 0;
        if (a.rating == null) return 1;
        if (b.rating == null) return -1;
        return b.rating - a.rating;
      });
    }
    if (sortBy === 'reviews') {
      return [...base].sort((a, b) => {
        if (a.reviews_count == null && b.reviews_count == null) return 0;
        if (a.reviews_count == null) return 1;
        if (b.reviews_count == null) return -1;
        return b.reviews_count - a.reviews_count;
      });
    }
    return base;
  })();

  const categoryCounts = products.reduce((acc, p) => {
    if (p.analyzed?.category) {
      acc[p.analyzed.category] = (acc[p.analyzed.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const selectedCount = selected.size;
  const visibleAvailable = filteredProducts.filter(p => !savedAsins.has(p.asin)).length;
  const visibleSelected = filteredProducts.filter(p => selected.has(p.asin)).length;
  const allVisibleSelected = visibleAvailable > 0 && visibleSelected === visibleAvailable;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex">
      {/* Left: Filter Panel */}
      <div className="w-72 shrink-0 border-r border-white/8 bg-[#141414] flex flex-col">
        <div className="p-5 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-sm">Amazon 상품 검색</h2>
          </div>
          <p className="text-white/30 text-xs mt-1">조건 설정 후 AI 키워드를 생성하세요</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Gender */}
          <div>
            <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2.5">
              Gender <span className="text-amber-400">*</span>
            </label>
            <div className="space-y-1.5">
              {GENDER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setGender(opt.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    gender === opt.value
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body Type */}
          <div>
            <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2.5">
              Body Type
            </label>
            <div className="space-y-1.5">
              {BODY_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setBodyType(prev => prev === opt.value ? '' : opt.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    bodyType === opt.value
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vibe */}
          <div>
            <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2.5">
              Style Vibe <span className="text-amber-400">*</span>
            </label>
            <div className="space-y-1.5">
              {VIBE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setVibe(opt.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    vibe === opt.value
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Season */}
          <div>
            <label className="block text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2.5">
              Season
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {SEASON_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSeason(prev => prev === opt.value ? '' : opt.value)}
                  className={`px-3 py-2 rounded-lg text-xs transition-all ${
                    season === opt.value
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Auto Mode Toggle */}
          <div className="border-t border-white/8 pt-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
                자동화 모드
              </label>
              <button
                onClick={() => setAutoMode(prev => !prev)}
                className={`relative w-9 h-5 rounded-full transition-colors ${autoMode ? 'bg-amber-500' : 'bg-white/15'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {autoMode && (
              <p className="text-white/30 text-[11px] leading-relaxed">
                모든 키워드를 순서대로 검색하고 상위 5개 상품을 자동으로 AI 분석 후 DB에 등록합니다.
              </p>
            )}
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="p-5 border-t border-white/8 space-y-2.5">
          {filtersChanged && !generatingKeywords && (
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
              <RefreshCw className="w-3 h-3 text-amber-400 shrink-0" />
              <p className="text-amber-400 text-[11px] leading-tight">조건이 변경되었습니다. 키워드를 재생성하세요.</p>
            </div>
          )}
          <button
            onClick={generateKeywords}
            disabled={!canGenerate || generatingKeywords || autoRunning}
            className={`w-full flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-all text-sm ${
              filtersChanged
                ? 'bg-amber-400 hover:bg-amber-300 ring-2 ring-amber-400/40 ring-offset-1 ring-offset-[#141414]'
                : 'bg-amber-500 hover:bg-amber-400'
            }`}
          >
            {generatingKeywords ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : filtersChanged ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generatingKeywords ? 'AI 키워드 생성 중...' : filtersChanged ? 'AI 키워드 재생성' : 'AI 키워드 생성'}
          </button>

          {autoMode && keywords.length > 0 && (
            <button
              onClick={autoRunning ? stopAutoMode : runAutoMode}
              disabled={generatingKeywords}
              className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all text-sm ${
                autoRunning
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                  : 'bg-white/8 hover:bg-white/15 text-white border border-white/10'
              }`}
            >
              {autoRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  자동화 중단
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  자동 전체 등록
                </>
              )}
            </button>
          )}

          {!canGenerate && (
            <p className="text-white/25 text-xs text-center">Gender와 Vibe를 선택하세요</p>
          )}
        </div>
      </div>

      {/* Right: Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {step === 'filter' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-white/30 text-base font-medium">왼쪽에서 조건을 설정하세요</p>
              <p className="text-white/15 text-sm mt-1">Gender와 Style Vibe는 필수입니다</p>
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Keywords Bar */}
            <div className="border-b border-white/8">
              {generatingKeywords ? (
                <div className="flex items-center gap-3 px-6 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span className="text-white/50 text-sm">Gemini가 카테고리별 키워드를 생성하고 있습니다...</span>
                </div>
              ) : keywordsError ? (
                <div className="flex items-center gap-2 text-red-400 text-sm px-6 py-4">
                  <AlertCircle className="w-4 h-4" />
                  {keywordsError}
                </div>
              ) : keywords.length > 0 ? (
                <div>
                  {/* Header row */}
                  <div className="flex items-center justify-between px-6 pt-3 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
                        AI 생성 키워드 ({keywords.length}) — 클릭해서 검색
                      </span>
                      {keywordsSource === 'gemini' && (
                        <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-medium">
                          Gemini AI
                        </span>
                      )}
                      {keywordsSource === 'fallback' && (
                        <span className="text-[10px] bg-white/8 text-white/30 px-2 py-0.5 rounded-full">
                          기본 키워드
                        </span>
                      )}
                    </div>
                    <button
                      onClick={generateKeywords}
                      disabled={autoRunning}
                      className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors disabled:opacity-30"
                    >
                      <RefreshCw className="w-3 h-3" />
                      재생성
                    </button>
                  </div>

                  {/* Category tabs for keywords */}
                  {Object.keys(keywordCategories).length > 0 && (
                    <div className="flex items-center gap-0 px-4 overflow-x-auto border-b border-white/5">
                      {[
                        { key: 'all', label: '전체' },
                        { key: 'outer', label: 'Outer' },
                        { key: 'mid', label: 'Mid' },
                        { key: 'top', label: 'Top' },
                        { key: 'bottom', label: 'Bottom' },
                        { key: 'shoes', label: 'Shoes' },
                        { key: 'bag', label: 'Bag' },
                        { key: 'accessory', label: 'Acc' },
                      ].map(tab => {
                        const count = tab.key === 'all'
                          ? keywords.length
                          : (keywordCategories[tab.key]?.length || 0);
                        if (tab.key !== 'all' && count === 0) return null;
                        return (
                          <button
                            key={tab.key}
                            onClick={() => setActiveKeywordCategory(tab.key)}
                            className={`flex items-center gap-1 px-3 py-2 text-[11px] font-medium whitespace-nowrap border-b-2 transition-all ${
                              activeKeywordCategory === tab.key
                                ? 'border-amber-400 text-amber-400'
                                : 'border-transparent text-white/30 hover:text-white/55'
                            }`}
                          >
                            <span>{tab.label}</span>
                            <span className={`text-[9px] px-1 rounded ${
                              activeKeywordCategory === tab.key ? 'text-amber-400/70' : 'text-white/20'
                            }`}>{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Keyword chips */}
                  <div className="flex flex-wrap gap-2 px-6 py-3">
                    {(activeKeywordCategory === 'all'
                      ? keywords
                      : (keywordCategories[activeKeywordCategory] || [])
                    ).map(kw => (
                      <button
                        key={kw}
                        onClick={() => !autoRunning && searchByKeyword(kw, 1)}
                        disabled={autoRunning}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all disabled:cursor-default ${
                          activeKeyword === kw
                            ? 'bg-amber-500 text-black'
                            : 'bg-white/8 text-white/60 hover:bg-white/15 hover:text-white'
                        }`}
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Auto Mode Log */}
            {autoMode && autoLog.length > 0 && (
              <div className="border-b border-white/8 px-6 py-3 bg-white/2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {autoRunning ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span className="text-xs text-white/50 font-medium">
                      자동화 진행 {autoRunning ? '중' : '완료'} — {autoSavedCount}개 등록됨
                    </span>
                  </div>
                  {!autoRunning && (
                    <button
                      onClick={() => setAutoLog([])}
                      className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
                    >
                      닫기
                    </button>
                  )}
                </div>
                <div className="max-h-24 overflow-y-auto space-y-0.5">
                  {autoLog.map((line, i) => (
                    <p key={i} className={`text-[11px] font-mono ${
                      line.includes('✓') ? 'text-emerald-400' :
                      line.includes('✗') || line.includes('실패') || line.includes('오류') ? 'text-red-400' :
                      line.includes('완료') ? 'text-amber-400' :
                      'text-white/35'
                    }`}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Category Tabs (shown after some products are analyzed) */}
            {products.length > 0 && (
              <div className="border-b border-white/8 px-6 flex items-center gap-1 overflow-x-auto">
                {CATEGORY_TABS.map(tab => {
                  const count = tab.value === 'all'
                    ? products.length
                    : categoryCounts[tab.value] || 0;
                  if (tab.value !== 'all' && count === 0) return null;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setCategoryFilter(tab.value)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                        categoryFilter === tab.value
                          ? 'border-amber-400 text-amber-400'
                          : 'border-transparent text-white/35 hover:text-white/60'
                      }`}
                    >
                      {tab.label}
                      {count > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          categoryFilter === tab.value
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-white/8 text-white/30'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Action Bar */}
            {filteredProducts.length > 0 && (
              <div className="border-b border-white/8 px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      allVisibleSelected
                        ? 'bg-amber-500 border-amber-500'
                        : visibleSelected > 0
                        ? 'bg-amber-500/40 border-amber-500/60'
                        : 'border-white/20'
                    }`}>
                      {allVisibleSelected && <Check className="w-3 h-3 text-black" />}
                      {!allVisibleSelected && visibleSelected > 0 && <Square className="w-2 h-2 text-amber-400 fill-amber-400" />}
                    </div>
                    전체 선택
                  </button>
                  {selectedCount > 0 && (
                    <span className="text-xs text-amber-400 font-medium">{selectedCount}개 선택됨</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                    {([
                      { value: 'default', label: '기본순' },
                      { value: 'rating', label: '별점순' },
                      { value: 'reviews', label: '리뷰수순' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSortBy(opt.value)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          sortBy === opt.value
                            ? 'bg-amber-500 text-black'
                            : 'text-white/40 hover:text-white/70'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {savingAll && (
                    <span className="text-xs text-white/40">
                      {saveProgress.done}/{saveProgress.total} 처리 중...
                    </span>
                  )}
                  <button
                    onClick={analyzeAndSave}
                    disabled={selectedCount === 0 || savingAll || autoRunning}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-black text-sm font-semibold px-4 py-2 rounded-lg transition-all"
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

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-6">
              {searchLoading && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="bg-white/5 rounded-xl overflow-hidden animate-pulse">
                      <div className="aspect-square bg-white/8" />
                      <div className="p-3 space-y-2">
                        <div className="h-2.5 bg-white/8 rounded w-3/4" />
                        <div className="h-2.5 bg-white/8 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchError && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="text-red-300 text-sm">{searchError}</p>
                </div>
              )}

              {!searchLoading && !searchError && products.length === 0 && activeKeyword && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Search className="w-12 h-12 text-white/10 mb-3" />
                  <p className="text-white/25 text-sm">검색 결과가 없습니다</p>
                </div>
              )}

              {!searchLoading && filteredProducts.length > 0 && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map(product => {
                      const isSaved = savedAsins.has(product.asin);
                      const isSelected = selected.has(product.asin);
                      const isAnalyzing = product.analyzing;

                      return (
                        <div
                          key={product.asin}
                          onClick={() => !isSaved && !isAnalyzing && !autoRunning && toggleSelect(product.asin)}
                          className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer ${
                            isSaved
                              ? 'border-emerald-500/30 bg-emerald-500/5 cursor-default'
                              : isSelected
                              ? 'border-amber-500/60 bg-amber-500/8 ring-2 ring-amber-500/20'
                              : 'border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/6'
                          }`}
                        >
                          <div className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isSaved
                              ? 'bg-emerald-500 border-emerald-500'
                              : isSelected
                              ? 'bg-amber-500 border-amber-500'
                              : 'bg-black/40 border-white/20 group-hover:border-white/40'
                          }`}>
                            {isSaved && <Check className="w-3 h-3 text-white" />}
                            {isSelected && !isSaved && <Check className="w-3 h-3 text-black" />}
                          </div>

                          {isAnalyzing && (
                            <div className="absolute inset-0 z-20 bg-black/60 flex flex-col items-center justify-center gap-2">
                              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                              <span className="text-xs text-amber-400 font-medium">AI 분석 중...</span>
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
                                <ShoppingBag className="w-8 h-8 text-gray-300" />
                              </div>
                            )}
                          </div>

                          <div className="p-2.5">
                            <p className="text-white/70 text-[11px] leading-snug line-clamp-2 mb-1.5 min-h-[2.5em]">
                              {product.title}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className={`font-semibold text-xs ${isSaved ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {isSaved ? '등록됨' : product.price != null ? `$${product.price.toFixed(2)}` : '-'}
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
                            className="absolute top-2 right-2 z-10 w-6 h-6 bg-black/40 hover:bg-black/70 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <ExternalLink className="w-3 h-3 text-white/60" />
                          </a>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {categoryFilter === 'all' && (
                    <div className="flex items-center justify-center gap-3 mt-6">
                      <button
                        onClick={() => searchByKeyword(activeKeyword, page - 1)}
                        disabled={page <= 1 || searchLoading || autoRunning}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs text-white/60 transition-all"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        이전
                      </button>
                      <span className="text-white/30 text-xs">페이지 {page} · 총 {total.toLocaleString()}개</span>
                      <button
                        onClick={() => searchByKeyword(activeKeyword, page + 1)}
                        disabled={searchLoading || autoRunning}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs text-white/60 transition-all"
                      >
                        다음
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}

              {!searchLoading && products.length === 0 && keywords.length > 0 && !activeKeyword && !autoRunning && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Search className="w-12 h-12 text-white/10 mb-3" />
                  <p className="text-white/30 text-base font-medium">키워드를 클릭해서 상품을 검색하세요</p>
                  {autoMode && (
                    <p className="text-white/20 text-sm mt-2">또는 왼쪽의 <span className="text-amber-400/60">자동 전체 등록</span> 버튼을 사용하세요</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
