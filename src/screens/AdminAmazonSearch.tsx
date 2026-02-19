import { useState } from 'react';
import { Search, ShoppingBag, Plus, Check, Star, ExternalLink, ChevronLeft, ChevronRight, Loader2, AlertCircle, Tag } from 'lucide-react';
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
  delivery: string;
}

interface TaggingState {
  category: string;
  gender: string;
  color: string;
  color_family: string;
  vibe: string[];
  body_type: string[];
  season: string[];
}

const CATEGORY_OPTIONS = ['outer', 'mid', 'top', 'bottom', 'shoes', 'bag', 'accessory'];
const GENDER_OPTIONS = ['MALE', 'FEMALE', 'UNISEX'];
const VIBE_OPTIONS = ['ELEVATED_COOL', 'EFFORTLESS_NATURAL', 'ARTISTIC_MINIMAL', 'RETRO_LUXE', 'SPORT_MODERN', 'CREATIVE_LAYERED'];
const BODY_TYPE_OPTIONS = ['slim', 'regular', 'plus-size'];
const SEASON_OPTIONS = ['spring', 'summer', 'fall', 'winter'];
const COLOR_FAMILY_OPTIONS = ['black', 'white', 'gray', 'navy', 'blue', 'green', 'red', 'pink', 'yellow', 'orange', 'brown', 'beige', 'purple', 'multicolor'];

const defaultTagging = (): TaggingState => ({
  category: '',
  gender: '',
  color: '',
  color_family: '',
  vibe: [],
  body_type: [],
  season: [],
});

export default function AdminAmazonSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AmazonProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedProduct, setSelectedProduct] = useState<AmazonProduct | null>(null);
  const [tagging, setTagging] = useState<TaggingState>(defaultTagging());
  const [saving, setSaving] = useState(false);
  const [savedAsins, setSavedAsins] = useState<Set<string>>(new Set());

  const search = async (p = 1) => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setPage(p);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('amazon-search', {
        body: { query: query.trim(), page: p },
      });

      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);

      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError((err as Error).message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search(1);
  };

  const openTagging = (product: AmazonProduct) => {
    setSelectedProduct(product);
    setTagging(defaultTagging());
  };

  const closeTagging = () => {
    setSelectedProduct(null);
    setTagging(defaultTagging());
  };

  const toggleArrayField = (field: 'vibe' | 'body_type' | 'season', value: string) => {
    setTagging(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleSave = async () => {
    if (!selectedProduct) return;
    if (!tagging.category || !tagging.gender) {
      alert('카테고리와 성별은 필수입니다.');
      return;
    }

    setSaving(true);
    try {
      const insertData = {
        brand: selectedProduct.brand || selectedProduct.title.split(' ')[0],
        name: selectedProduct.title,
        category: tagging.category,
        gender: tagging.gender,
        color: tagging.color,
        color_family: tagging.color_family,
        vibe: tagging.vibe,
        body_type: tagging.body_type,
        season: tagging.season,
        image_url: selectedProduct.image,
        product_link: selectedProduct.url,
        price: selectedProduct.price,
        stock_status: 'in_stock',
        silhouette: '',
        material: '',
      };

      const { error: insertError } = await supabase.from('products').insert(insertData);
      if (insertError) throw insertError;

      setSavedAsins(prev => new Set([...prev, selectedProduct.asin]));
      closeTagging();
      alert(`"${selectedProduct.title.slice(0, 40)}..." 제품이 등록되었습니다.`);
    } catch (err) {
      alert('저장 실패: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / 15) || 1;

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-7 h-7 text-amber-400" />
            <h1 className="text-2xl font-bold">Amazon 상품 검색</h1>
          </div>
          <p className="text-white/50 text-sm">SerpApi를 통해 Amazon 상품을 검색하고 제품 DB에 등록하세요</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
              <input
                type="text"
                placeholder="예: men's slim fit chino pants, women's oversized hoodie..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60 focus:bg-white/8 transition-all"
              />
            </div>
            <button
              onClick={() => search(1)}
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold px-6 py-3.5 rounded-xl transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              검색
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Results Info */}
        {results.length > 0 && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/40 text-sm">
              총 약 {total.toLocaleString()}개 결과 · 페이지 {page} / {totalPages}
            </p>
            <p className="text-white/40 text-sm">
              {savedAsins.size > 0 && <span className="text-emerald-400">{savedAsins.size}개 등록됨</span>}
            </p>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white/5 rounded-xl overflow-hidden animate-pulse">
                <div className="w-full aspect-square bg-white/10" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Grid */}
        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {results.map(product => {
              const isSaved = savedAsins.has(product.asin);
              return (
                <div
                  key={product.asin}
                  className={`group bg-white/5 border rounded-xl overflow-hidden transition-all hover:bg-white/8 ${
                    isSaved ? 'border-emerald-500/40' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="relative aspect-square bg-white overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-contain p-2"
                        onError={e => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://via.placeholder.com/200x200?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/10">
                        <ShoppingBag className="w-8 h-8 text-white/20" />
                      </div>
                    )}
                    {isSaved && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <div className="bg-emerald-500 rounded-full p-2">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}
                    {product.is_prime && (
                      <div className="absolute top-1.5 left-1.5 bg-[#232F3E] text-[#FF9900] text-[9px] font-bold px-1.5 py-0.5 rounded">
                        prime
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="text-white/80 text-xs leading-snug line-clamp-2 mb-2 min-h-[2.5rem]">
                      {product.title}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-amber-400 font-semibold text-sm">
                        {product.price != null
                          ? `$${product.price.toFixed(2)}`
                          : '가격 없음'}
                      </span>
                      {product.rating != null && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-white/50 text-xs">{product.rating}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openTagging(product)}
                        disabled={isSaved}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-amber-400 text-xs font-medium py-2 rounded-lg transition-all"
                      >
                        {isSaved ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            등록됨
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            등록
                          </>
                        )}
                      </button>
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-8 h-8 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-white/40" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ShoppingBag className="w-16 h-16 text-white/10 mb-4" />
            <p className="text-white/30 text-lg font-medium">Amazon 상품을 검색해보세요</p>
            <p className="text-white/20 text-sm mt-1">키워드를 입력하고 검색 버튼을 누르세요</p>
          </div>
        )}

        {/* Pagination */}
        {results.length > 0 && !loading && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => search(page - 1)}
              disabled={page <= 1}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm text-white/70 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>
            <span className="text-white/40 text-sm px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => search(page + 1)}
              disabled={page >= totalPages}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm text-white/70 transition-all"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Tagging Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-start gap-4">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.title}
                  className="w-20 h-20 object-contain bg-white rounded-lg p-1 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">
                    {selectedProduct.title}
                  </h3>
                  <p className="text-amber-400 font-bold mt-1">
                    {selectedProduct.price != null ? `$${selectedProduct.price.toFixed(2)}` : '가격 없음'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <Tag className="w-4 h-4" />
                <span className="text-sm font-semibold">제품 태깅 (필수: 카테고리, 성별)</span>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">카테고리 *</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setTagging(p => ({ ...p, category: opt }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        tagging.category === opt
                          ? 'bg-amber-500 text-black'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">성별 *</label>
                <div className="flex gap-2">
                  {GENDER_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setTagging(p => ({ ...p, gender: opt }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        tagging.gender === opt
                          ? 'bg-amber-500 text-black'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">색상 이름</label>
                  <input
                    type="text"
                    placeholder="예: Navy Blue, Off-White..."
                    value={tagging.color}
                    onChange={e => setTagging(p => ({ ...p, color: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-amber-400/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">색상 계열</label>
                  <select
                    value={tagging.color_family}
                    onChange={e => setTagging(p => ({ ...p, color_family: e.target.value }))}
                    className="w-full bg-[#222] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400/50"
                  >
                    <option value="">선택</option>
                    {COLOR_FAMILY_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vibe */}
              <div>
                <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">분위기 (복수 선택)</label>
                <div className="flex flex-wrap gap-2">
                  {VIBE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => toggleArrayField('vibe', opt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        tagging.vibe.includes(opt)
                          ? 'bg-amber-500 text-black'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {opt.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Type */}
              <div>
                <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">체형 (복수 선택)</label>
                <div className="flex gap-2">
                  {BODY_TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => toggleArrayField('body_type', opt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        tagging.body_type.includes(opt)
                          ? 'bg-amber-500 text-black'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Season */}
              <div>
                <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">시즌 (복수 선택)</label>
                <div className="flex gap-2">
                  {SEASON_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => toggleArrayField('season', opt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        tagging.season.includes(opt)
                          ? 'bg-amber-500 text-black'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex gap-3">
              <button
                onClick={closeTagging}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-all"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !tagging.category || !tagging.gender}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                DB에 등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
