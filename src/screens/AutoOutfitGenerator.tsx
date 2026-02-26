import { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, Anchor, Search, Check, Wand2 } from 'lucide-react';
import { generateOutfitsAutomatically, GeneratedOutfit } from '../utils/outfitGenerator';
import { supabase } from '../utils/supabase';
import { Product } from '../data/outfits';

interface AutoOutfitGeneratorProps {
  onClose: () => void;
  onGenerated: () => void;
}

const GENDER_OPTIONS = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
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
  { value: 'spring', label: '봄' },
  { value: 'summer', label: '여름' },
  { value: 'fall', label: '가을' },
  { value: 'winter', label: '겨울' },
];

const SLOT_OPTIONS = [
  { value: 'outer', label: 'Outer', category: 'outer' },
  { value: 'mid', label: 'Mid Layer', category: 'mid' },
  { value: 'top', label: 'Top', category: 'top' },
  { value: 'bottom', label: 'Bottom', category: 'bottom' },
  { value: 'shoes', label: 'Shoes', category: 'shoes' },
  { value: 'bag', label: 'Bag', category: 'bag' },
  { value: 'accessory', label: 'Accessory', category: 'accessory' },
];

export default function AutoOutfitGenerator({ onClose, onGenerated }: AutoOutfitGeneratorProps) {
  const [gender, setGender] = useState('MALE');
  const [bodyType, setBodyType] = useState('slim');
  const [vibe, setVibe] = useState('ELEVATED_COOL');
  const [count, setCount] = useState(5);
  const [season, setSeason] = useState('');
  const [warmth, setWarmth] = useState('');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedOutfit[]>([]);
  const [error, setError] = useState('');

  const [anchorEnabled, setAnchorEnabled] = useState(false);
  const [anchorSlot, setAnchorSlot] = useState('');
  const [anchorProductId, setAnchorProductId] = useState('');
  const [anchorProducts, setAnchorProducts] = useState<Product[]>([]);
  const [anchorSearchQuery, setAnchorSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (!anchorEnabled || !anchorSlot) {
      setAnchorProducts([]);
      setAnchorProductId('');
      setAnchorSearchQuery('');
      return;
    }

    const loadProducts = async () => {
      setLoadingProducts(true);
      setAnchorProductId('');
      const slot = SLOT_OPTIONS.find(s => s.value === anchorSlot);
      if (!slot) return;

      const { data, error: err } = await supabase
        .from('products')
        .select('*')
        .eq('category', slot.category)
        .order('created_at', { ascending: false });

      if (!err && data) {
        setAnchorProducts(data.map(p => ({
          id: p.id,
          brand: p.brand,
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
          affiliate_link: p.affiliate_link || '',
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
        })));
      }
      setLoadingProducts(false);
    };

    loadProducts();
  }, [anchorEnabled, anchorSlot]);

  const filteredAnchorProducts = anchorProducts.filter(p => {
    if (!anchorSearchQuery) return true;
    const q = anchorSearchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      (p.color || '').toLowerCase().includes(q)
    );
  });

  const selectedAnchorProduct = anchorProducts.find(p => p.id === anchorProductId);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setResults([]);

    try {
      const targetWarmth = warmth ? parseInt(warmth) : undefined;
      const targetSeason = season || undefined;

      const generated = await generateOutfitsAutomatically({
        gender,
        bodyType,
        vibe,
        count,
        targetWarmth,
        targetSeason,
        anchorProductId: anchorEnabled && anchorProductId ? anchorProductId : undefined,
        anchorSlot: anchorEnabled && anchorSlot ? anchorSlot : undefined,
      });

      setResults(generated);
    } catch (err) {
      console.error('Generation error:', err);
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = () => {
    onGenerated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">자동 코디 생성</h2>
              <p className="text-sm text-gray-600">AI 매칭 엔진으로 최적의 코디를 자동 생성합니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {!results.length && !error && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  성별 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {GENDER_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setGender(option.value)}
                      className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                        gender === option.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  체형 <span className="text-red-500">*</span>
                </label>
                <select
                  value={bodyType}
                  onChange={(e) => setBodyType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {BODY_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  스타일 <span className="text-red-500">*</span>
                </label>
                <select
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {VIBE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  생성 개수
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">1~20개의 코디를 생성할 수 있습니다</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    계절 (선택사항)
                  </label>
                  <select
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">전체</option>
                    {SEASON_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    보온성 (선택사항)
                  </label>
                  <select
                    value={warmth}
                    onChange={(e) => setWarmth(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">전체</option>
                    <option value="1">1 (가벼움)</option>
                    <option value="2">2</option>
                    <option value="3">3 (보통)</option>
                    <option value="4">4</option>
                    <option value="5">5 (따뜻함)</option>
                  </select>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    setAnchorEnabled(!anchorEnabled);
                    if (anchorEnabled) {
                      setAnchorSlot('');
                      setAnchorProductId('');
                      setAnchorSearchQuery('');
                    }
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Anchor size={18} className={anchorEnabled ? 'text-blue-600' : 'text-gray-400'} />
                    <span className="text-sm font-medium text-gray-700">앵커 아이템 (선택사항)</span>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${anchorEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${anchorEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                </button>

                {anchorEnabled && (
                  <div className="p-4 space-y-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      특정 제품을 기준으로 고정하면, 나머지 슬롯을 매칭 엔진이 자동으로 채웁니다.
                    </p>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">슬롯 선택</label>
                      <div className="flex flex-wrap gap-2">
                        {SLOT_OPTIONS.map(slot => (
                          <button
                            key={slot.value}
                            onClick={() => setAnchorSlot(slot.value)}
                            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                              anchorSlot === slot.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {slot.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {anchorSlot && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">제품 선택</label>

                        {selectedAnchorProduct && (
                          <div className="mb-3 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            {selectedAnchorProduct.image_url && (
                              <img
                                src={selectedAnchorProduct.image_url}
                                alt=""
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{selectedAnchorProduct.name}</p>
                              <p className="text-xs text-gray-500">{selectedAnchorProduct.brand}</p>
                            </div>
                            <button
                              onClick={() => setAnchorProductId('')}
                              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        )}

                        {!selectedAnchorProduct && (
                          <>
                            <div className="relative mb-2">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                value={anchorSearchQuery}
                                onChange={(e) => setAnchorSearchQuery(e.target.value)}
                                placeholder="브랜드, 이름, 색상으로 검색..."
                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            {loadingProducts ? (
                              <div className="flex items-center justify-center py-6">
                                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : filteredAnchorProducts.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-4">
                                {anchorProducts.length === 0 ? '해당 슬롯에 제품이 없습니다' : '검색 결과가 없습니다'}
                              </p>
                            ) : (
                              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                                {filteredAnchorProducts.map(product => (
                                  <button
                                    key={product.id}
                                    onClick={() => setAnchorProductId(product.id)}
                                    className="w-full flex items-center gap-3 p-2.5 hover:bg-gray-50 transition-colors text-left"
                                  >
                                    {product.image_url ? (
                                      <img
                                        src={product.image_url}
                                        alt=""
                                        className="w-10 h-10 object-cover rounded flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 bg-gray-100 rounded flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-900 truncate">{product.name}</p>
                                      <p className="text-xs text-gray-500">{product.brand} {product.color ? `/ ${product.color}` : ''}</p>
                                    </div>
                                    {product.id === anchorProductId && (
                                      <Check size={16} className="text-blue-600 flex-shrink-0" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">자동 생성 안내</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>AI 매칭 엔진이 6가지 기준으로 최적의 조합을 찾습니다</li>
                      <li>컬러 조화, 톤 일치, 패턴 밸런스, 격식 수준, 보온성, 계절 적합성</li>
                      <li>코디 사용 3회 이상인 제품은 자동으로 제외됩니다</li>
                      <li>생성된 코디는 "pending_render" 상태로 저장됩니다</li>
                      <li>비어있는 선택 슬롯(가방·액세서리 등)은 추천 엔진이 자동 보완합니다</li>
                      {anchorEnabled && anchorProductId && (
                        <li>앵커 아이템은 사용 한도와 관계없이 모든 코디에 포함됩니다</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || (anchorEnabled && anchorSlot && !anchorProductId ? true : false)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg shadow-lg"
              >
                {generating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    코디 자동 생성
                  </>
                )}
              </button>
              {anchorEnabled && anchorSlot && !anchorProductId && (
                <p className="text-xs text-amber-600 text-center -mt-3">앵커 아이템 제품을 선택하거나, 앵커 기능을 끄세요</p>
              )}
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-900 mb-1">생성 실패</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setError('');
                  setResults([]);
                }}
                className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                다시 시도
              </button>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 mb-1">생성 완료!</p>
                    <p className="text-sm text-green-700">
                      {results.length}개의 코디가 성공적으로 생성되었습니다.
                      {anchorEnabled && selectedAnchorProduct && (
                        <span className="block mt-1 text-xs">
                          앵커: {selectedAnchorProduct.brand} {selectedAnchorProduct.name}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">생성된 코디 목록</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                      앵커
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                      자동 보완
                    </span>
                  </div>
                </div>
                {results.map((result, idx) => {
                  const autoFilledSet = new Set(result.autoFilledSlots || []);
                  const totalSlots = result.items.length + (result.autoFilledSlots?.length ?? 0);
                  return (
                    <div
                      key={result.outfitId}
                      className="bg-white rounded-lg p-3 border border-gray-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            코디 #{idx + 1}
                          </p>
                          <p className="text-xs text-gray-500">
                            {totalSlots}개 아이템 · 매칭 점수: {result.matchScore}점
                            {autoFilledSet.size > 0 && (
                              <span className="ml-1.5 text-emerald-600 font-medium">
                                +{autoFilledSet.size}개 보완
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 justify-end">
                          {result.items.map(item => {
                            const isAnchor = anchorEnabled && item.slot_type === anchorSlot && item.product_id === anchorProductId;
                            const isAutoFilled = autoFilledSet.has(item.slot_type);
                            return (
                              <span
                                key={item.slot_type}
                                className={`px-2 py-0.5 rounded text-xs flex items-center gap-0.5 ${
                                  isAnchor
                                    ? 'bg-blue-100 text-blue-700 font-medium'
                                    : isAutoFilled
                                    ? 'bg-emerald-100 text-emerald-700 font-medium'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {item.slot_type}
                                {isAnchor && <Anchor size={9} className="ml-0.5" />}
                                {isAutoFilled && <Wand2 size={9} className="ml-0.5" />}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setResults([]);
                    setError('');
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  더 생성하기
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  완료
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
