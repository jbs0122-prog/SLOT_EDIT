import { useState, useCallback } from 'react';
import {
  ShoppingBag, Search, Sparkles, Plus, Check, Star, ExternalLink,
  ChevronLeft, ChevronRight, Loader2, AlertCircle, X, Tag,
  RefreshCw, Filter
} from 'lucide-react';
import { supabase } from '../utils/supabase';

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

export default function AdminAmazonSearch() {
  const [step, setStep] = useState<Step>('filter');

  const [gender, setGender] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [vibe, setVibe] = useState('');
  const [season, setSeason] = useState('');

  const [keywords, setKeywords] = useState<string[]>([]);
  const [generatingKeywords, setGeneratingKeywords] = useState(false);
  const [keywordsError, setKeywordsError] = useState('');

  const [activeKeyword, setActiveKeyword] = useState('');
  const [products, setProducts] = useState<AnalyzedProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [savedAsins, setSavedAsins] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 });

  const canGenerate = gender && vibe;

  const generateKeywords = async () => {
    if (!canGenerate) return;
    setGeneratingKeywords(true);
    setKeywordsError('');
    setKeywords([]);
    setProducts([]);
    setSelected(new Set());
    setStep('results');

    try {
      const { data, error } = await supabase.functions.invoke('generate-amazon-keywords', {
        body: { gender, body_type: bodyType, vibe, season },
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      setKeywords(data.keywords || []);
    } catch (err) {
      setKeywordsError((err as Error).message);
    } finally {
      setGeneratingKeywords(false);
    }
  };

  const searchByKeyword = useCallback(async (kw: string, p = 1) => {
    setActiveKeyword(kw);
    setSearchLoading(true);
    setSearchError('');
    setPage(p);
    setProducts([]);
    setSelected(new Set());

    try {
      const { data, error } = await supabase.functions.invoke('amazon-search', {
        body: { query: kw, page: p },
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      setProducts((data.results || []).map((r: AmazonProduct) => ({ ...r })));
      setTotal(data.total || 0);
    } catch (err) {
      setSearchError((err as Error).message);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const toggleSelect = (asin: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(asin) ? next.delete(asin) : next.add(asin);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const available = products.filter(p => !savedAsins.has(p.asin)).map(p => p.asin);
    if (selected.size === available.length && available.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(available));
    }
  };

  const analyzeAndSave = async () => {
    const toSave = products.filter(p => selected.has(p.asin) && !savedAsins.has(p.asin));
    if (toSave.length === 0) return;

    setSavingAll(true);
    setSaveProgress({ done: 0, total: toSave.length });

    for (let i = 0; i < toSave.length; i++) {
      const product = toSave[i];

      setProducts(prev =>
        prev.map(p => p.asin === product.asin ? { ...p, analyzing: true, analyzeError: undefined } : p)
      );

      try {
        const { data, error } = await supabase.functions.invoke('analyze-amazon-product', {
          body: { product, gender, body_type: bodyType, vibe, season },
        });

        if (error) throw new Error(error.message);
        if (data.error) throw new Error(data.error);

        const analyzed = data.result;

        const { error: insertError } = await supabase.from('products').insert({
          brand: analyzed.brand,
          name: analyzed.name,
          category: analyzed.category,
          sub_category: analyzed.sub_category,
          gender: analyzed.gender,
          color: analyzed.color,
          color_family: analyzed.color_family,
          color_tone: analyzed.color_tone,
          silhouette: analyzed.silhouette,
          material: analyzed.material,
          pattern: analyzed.pattern,
          vibe: analyzed.vibe,
          body_type: analyzed.body_type,
          season: analyzed.season,
          formality: analyzed.formality,
          warmth: analyzed.warmth,
          stock_status: analyzed.stock_status,
          image_url: analyzed.image_url,
          product_link: analyzed.product_link,
          price: analyzed.price,
        });

        if (insertError) throw insertError;

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

      setSaveProgress({ done: i + 1, total: toSave.length });
    }

    setSavingAll(false);
  };

  const selectedCount = selected.size;
  const availableCount = products.filter(p => !savedAsins.has(p.asin)).length;

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
        </div>

        {/* Generate Button */}
        <div className="p-5 border-t border-white/8">
          <button
            onClick={generateKeywords}
            disabled={!canGenerate || generatingKeywords}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-all text-sm"
          >
            {generatingKeywords ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {generatingKeywords ? 'AI 키워드 생성 중...' : 'AI 키워드 생성'}
          </button>
          {!canGenerate && (
            <p className="text-white/25 text-xs text-center mt-2">Gender와 Vibe를 선택하세요</p>
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
            <div className="border-b border-white/8 px-6 py-4">
              {generatingKeywords ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span className="text-white/50 text-sm">Gemini가 키워드를 생성하고 있습니다...</span>
                </div>
              ) : keywordsError ? (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {keywordsError}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/30 uppercase tracking-wider font-semibold">
                      AI 생성 키워드 ({keywords.length}) — 클릭해서 검색
                    </p>
                    <button
                      onClick={generateKeywords}
                      className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      재생성
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map(kw => (
                      <button
                        key={kw}
                        onClick={() => searchByKeyword(kw, 1)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
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
              )}
            </div>

            {/* Action Bar */}
            {products.length > 0 && (
              <div className="border-b border-white/8 px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      selectedCount > 0 && selectedCount === availableCount
                        ? 'bg-amber-500 border-amber-500'
                        : 'border-white/20'
                    }`}>
                      {selectedCount > 0 && selectedCount === availableCount && (
                        <Check className="w-3 h-3 text-black" />
                      )}
                    </div>
                    전체 선택
                  </button>
                  {selectedCount > 0 && (
                    <span className="text-xs text-amber-400 font-medium">{selectedCount}개 선택됨</span>
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

              {!searchLoading && products.length > 0 && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {products.map(product => {
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
                              ? 'border-amber-500/60 bg-amber-500/8 ring-2 ring-amber-500/20'
                              : 'border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/6'
                          }`}
                        >
                          {/* Selection indicator */}
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

                          {/* Analyzing overlay */}
                          {isAnalyzing && (
                            <div className="absolute inset-0 z-20 bg-black/60 flex flex-col items-center justify-center gap-2">
                              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                              <span className="text-xs text-amber-400 font-medium">AI 분석 중...</span>
                            </div>
                          )}

                          {/* Error overlay */}
                          {product.analyzeError && (
                            <div className="absolute inset-0 z-20 bg-red-900/60 flex flex-col items-center justify-center gap-1 p-2">
                              <AlertCircle className="w-5 h-5 text-red-400" />
                              <span className="text-[10px] text-red-300 text-center leading-tight">
                                {product.analyzeError.slice(0, 60)}
                              </span>
                            </div>
                          )}

                          {/* Image */}
                          <div className="aspect-square bg-white overflow-hidden">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.title}
                                className="w-full h-full object-contain p-2"
                                onError={e => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="w-8 h-8 text-gray-300" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
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

                            {/* Analyzed tags preview */}
                            {product.analyzed && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded">
                                  {product.analyzed.category}
                                </span>
                                {product.analyzed.color_family && (
                                  <span className="text-[9px] bg-white/8 text-white/40 px-1.5 py-0.5 rounded">
                                    {product.analyzed.color_family}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* External link */}
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
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button
                      onClick={() => searchByKeyword(activeKeyword, page - 1)}
                      disabled={page <= 1 || searchLoading}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs text-white/60 transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      이전
                    </button>
                    <span className="text-white/30 text-xs">페이지 {page}</span>
                    <button
                      onClick={() => searchByKeyword(activeKeyword, page + 1)}
                      disabled={searchLoading}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs text-white/60 transition-all"
                    >
                      다음
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}

              {!searchLoading && products.length === 0 && keywords.length > 0 && !activeKeyword && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Search className="w-12 h-12 text-white/10 mb-3" />
                  <p className="text-white/30 text-base font-medium">키워드를 클릭해서 상품을 검색하세요</p>
                  <p className="text-white/15 text-sm mt-1">위의 키워드 중 하나를 선택하세요</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
