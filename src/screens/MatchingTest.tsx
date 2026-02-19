import { useState, useEffect } from 'react';
import { Product } from '../data/outfits';
import { supabase } from '../utils/supabase';
import {
  findBestOutfits,
  OutfitCandidate,
  MatchScore
} from '../utils/matchingEngine';
import { Sparkles, RefreshCw } from 'lucide-react';

export default function MatchingTest() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ outfit: OutfitCandidate; matchScore: MatchScore }>>([]);

  const [filters, setFilters] = useState({
    gender: 'MALE',
    bodyType: 'regular',
    vibe: 'ELEVATED_COOL',
    targetWarmth: 3,
    targetSeason: 'fall'
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('stock_status', 'in_stock');

      if (error) throw error;

      const mappedProducts: Product[] = (data || []).map(p => ({
        id: p.id,
        brand: p.brand || '',
        name: p.name,
        category: p.category,
        gender: p.gender,
        body_type: p.body_type || [],
        vibe: p.vibe || [],
        color: p.color || '',
        season: p.season || [],
        silhouette: p.silhouette || '',
        image_url: p.image_url,
        product_link: p.product_link || '',
        price: p.price,
        stock_status: p.stock_status || 'in_stock',
        material: p.material || '',
        color_family: p.color_family || '',
        color_tone: p.color_tone || '',
        sub_category: p.sub_category || '',
        pattern: p.pattern || '',
        formality: typeof p.formality === 'number' ? p.formality : undefined,
        warmth: typeof p.warmth === 'number' ? p.warmth : undefined,
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));

      setProducts(mappedProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const bestOutfits = await findBestOutfits(products, filters, 5);
      setResults(bestOutfits);
    } catch (error) {
      console.error('Failed to generate outfits:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderProduct = (product: Product | undefined, label: string) => {
    if (!product) return null;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
        <div className="flex gap-3">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-16 h-16 object-cover rounded"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
            <p className="text-xs text-gray-500">{product.brand}</p>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {product.color_family && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  {product.color_family}
                </span>
              )}
              {product.pattern && (
                <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">
                  {product.pattern}
                </span>
              )}
              {product.material && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                  {product.material}
                </span>
              )}
              {product.sub_category && (
                <span className="text-xs bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                  {product.sub_category}
                </span>
              )}
              {product.formality !== undefined && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  F:{product.formality}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="text-blue-600" size={28} />
                매칭 엔진 테스트
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                총 {products.length}개 제품 로드됨
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || products.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              {loading ? '생성 중...' : '코디 생성'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">성별</label>
              <select
                value={filters.gender}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="MALE">남성</option>
                <option value="FEMALE">여성</option>
                <option value="UNISEX">유니섹스</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">체형</label>
              <select
                value={filters.bodyType}
                onChange={(e) => setFilters({ ...filters, bodyType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="slim">Slim</option>
                <option value="regular">Regular</option>
                <option value="plus-size">Plus-size</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">무드</label>
              <select
                value={filters.vibe}
                onChange={(e) => setFilters({ ...filters, vibe: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="ELEVATED_COOL">Elevated Cool</option>
                <option value="EFFORTLESS_NATURAL">Effortless Natural</option>
                <option value="ARTISTIC_MINIMAL">Artistic Minimal</option>
                <option value="RETRO_LUXE">Retro Luxe</option>
                <option value="SPORT_MODERN">Sport Modern</option>
                <option value="CREATIVE_LAYERED">Creative Layered</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                보온감: {filters.targetWarmth}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={filters.targetWarmth}
                onChange={(e) => setFilters({ ...filters, targetWarmth: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>여름</span>
                <span>겨울</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">시즌</label>
              <select
                value={filters.targetSeason}
                onChange={(e) => setFilters({ ...filters, targetSeason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
                <option value="fall">Fall</option>
                <option value="winter">Winter</option>
              </select>
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <div className="space-y-6">
            {results.map((result, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    코디 #{index + 1}
                  </h2>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">
                      {result.matchScore.score}
                    </div>
                    <div className="text-xs text-gray-500">총점</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                  {([
                    ['colorMatch', 'Color', '16%'],
                    ['toneMatch', 'Tone', '10%'],
                    ['patternBalance', 'Pattern', '10%'],
                    ['formalityMatch', 'Formality', '10%'],
                    ['warmthMatch', 'Warmth', '6%'],
                    ['seasonMatch', 'Season', '6%'],
                    ['silhouetteBalance', 'Silhouette', '12%'],
                    ['materialCompat', 'Material', '8%'],
                    ['subCategoryMatch', 'SubCat', '6%'],
                    ['colorDepth', 'Palette', '6%'],
                    ['moodCoherence', 'Mood', '6%'],
                    ['accessoryHarmony', 'Accessory', '4%'],
                  ] as const).map(([key, label, weight]) => (
                    <div key={key} className="text-center">
                      <div className="text-2xl font-bold text-gray-700">
                        {(result.matchScore.breakdown as Record<string, number>)[key]}
                      </div>
                      <div className="text-xs text-gray-500">{label}</div>
                      <div className="text-[10px] text-gray-400">{weight}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.outfit.outer && renderProduct(result.outfit.outer, 'OUTER')}
                  {renderProduct(result.outfit.top, 'TOP')}
                  {renderProduct(result.outfit.bottom, 'BOTTOM')}
                  {renderProduct(result.outfit.shoes, 'SHOES')}
                  {result.outfit.bag && renderProduct(result.outfit.bag, 'BAG')}
                  {result.outfit.accessory && renderProduct(result.outfit.accessory, 'ACCESSORY')}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && products.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Sparkles className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">
              필터를 설정하고 "코디 생성" 버튼을 클릭하세요
            </p>
          </div>
        )}

        {products.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600">
              제품 데이터를 불러오는 중...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
