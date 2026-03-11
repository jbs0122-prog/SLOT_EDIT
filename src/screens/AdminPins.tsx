import { useState, useEffect, useRef, useMemo } from 'react';
import { Outfit, ImagePin, Product } from '../data/outfits';
import { supabase } from '../utils/supabase';
import { outfitWarmthToTempRange } from '../utils/weather';
import { X, Save, ArrowLeft, Package, Thermometer, Snowflake, Sun, Leaf, Wind } from 'lucide-react';
import { scoreProductForVibe, COLOR_TIER_LABELS, type VibeCompatScore } from '../utils/vibeCompatibility';

const SEASON_LABELS: Record<string, string> = {
  spring: '봄',
  summer: '여름',
  fall: '가을',
  winter: '겨울',
};

function computeOutfitWarmth(items: { category: string; warmth: number }[]): number | undefined {
  const CLOTHING = ['outer', 'mid', 'top', 'bottom'];
  const SHOES_WEIGHT = 0.4;
  let sum = 0;
  let weight = 0;
  for (const item of items) {
    if (CLOTHING.includes(item.category)) { sum += item.warmth * 1.0; weight += 1.0; }
    else if (item.category === 'shoes') { sum += item.warmth * SHOES_WEIGHT; weight += SHOES_WEIGHT; }
  }
  return weight > 0 ? sum / weight : undefined;
}

const warmthToTempRangeF = outfitWarmthToTempRange;

function warmthToSeasons(warmth: number): string[] {
  if (warmth >= 3.8) return ['winter'];
  if (warmth >= 3.0) return ['winter', 'fall'];
  if (warmth >= 2.2) return ['fall', 'spring'];
  return ['summer', 'spring'];
}

function getWarmthLabel(warmth: number): string {
  if (warmth >= 3.8) return '매우 두꺼움';
  if (warmth >= 3.0) return '두꺼움';
  if (warmth >= 2.2) return '보통';
  if (warmth >= 1.6) return '얇음';
  return '매우 얇음';
}

function getWarmthColor(warmth: number): string {
  if (warmth >= 3.8) return 'bg-blue-100 text-blue-700';
  if (warmth >= 3.0) return 'bg-sky-100 text-sky-700';
  if (warmth >= 2.2) return 'bg-amber-50 text-amber-600';
  if (warmth >= 1.6) return 'bg-orange-100 text-orange-600';
  return 'bg-red-100 text-red-600';
}

function SeasonIcon({ season, size = 9 }: { season: string; size?: number }) {
  if (season === 'winter') return <Snowflake size={size} className="text-blue-500" />;
  if (season === 'summer') return <Sun size={size} className="text-amber-500" />;
  if (season === 'fall') return <Leaf size={size} className="text-orange-500" />;
  return <Wind size={size} className="text-green-500" />;
}

type ImageType = 'flatlay' | 'on_model';

interface OutfitWithMeta extends Outfit {
  avg_warmth?: number;
  temp_range_f?: { min: number; max: number };
  auto_seasons?: string[];
}

export default function AdminPins() {
  const [outfits, setOutfits] = useState<OutfitWithMeta[]>([]);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageType>('flatlay');
  const [pins, setPins] = useState<ImagePin[]>([]);
  const [selectedPinIndex, setSelectedPinIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [showProductsPanel, setShowProductsPanel] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const PINS_FILTER_KEY = 'admin_pins_filters';
  const savedPinsFilters = (() => { try { const v = sessionStorage.getItem(PINS_FILTER_KEY); return v ? JSON.parse(v) : null; } catch { return null; } })();
  const [filterGender, setFilterGender] = useState<string>(savedPinsFilters?.filterGender ?? '');
  const [filterBodyType, setFilterBodyType] = useState<string>(savedPinsFilters?.filterBodyType ?? '');
  const [filterVibe, setFilterVibe] = useState<string>(savedPinsFilters?.filterVibe ?? '');
  const [filterSeason, setFilterSeason] = useState<string>(savedPinsFilters?.filterSeason ?? '');
  const [tpo, setTpo] = useState<string>('');

  useEffect(() => {
    sessionStorage.setItem(PINS_FILTER_KEY, JSON.stringify({ filterGender, filterBodyType, filterVibe, filterSeason }));
  }, [filterGender, filterBodyType, filterVibe, filterSeason]);

  useEffect(() => {
    loadOutfits();
    loadProducts();
  }, []);

  const loadOutfits = async () => {
    try {
      const [outfitsResult, itemsResult] = await Promise.all([
        supabase.from('outfits').select('*').order('created_at', { ascending: false }),
        supabase.from('outfit_items').select('outfit_id, product:products(warmth, category)'),
      ]);

      if (outfitsResult.error) throw outfitsResult.error;

      const itemsByOutfit: Record<string, { category: string; warmth: number }[]> = {};
      if (itemsResult.data) {
        for (const item of itemsResult.data) {
          const oid = item.outfit_id;
          if (!itemsByOutfit[oid]) itemsByOutfit[oid] = [];
          const p = item.product as { warmth?: number; category?: string } | null;
          if (p && typeof p.warmth === 'number' && typeof p.category === 'string') {
            itemsByOutfit[oid].push({ category: p.category, warmth: p.warmth });
          }
        }
      }

      const outfitsData: OutfitWithMeta[] = (outfitsResult.data || []).map(row => {
        const items = itemsByOutfit[row.id] || [];
        const avgWarmth = computeOutfitWarmth(items);
        return {
          id: row.id,
          gender: row.gender,
          body_type: row.body_type,
          vibe: row.vibe,
          season: row.season || [],
          image_url_flatlay: row.image_url_flatlay || '',
          image_url_flatlay_clean: row.image_url_flatlay_clean || '',
          image_url_on_model: row.image_url_on_model || '',
          insight_text: row['AI insight'] || '',
          flatlay_pins: row.flatlay_pins || [],
          on_model_pins: row.on_model_pins || [],
          tpo: row.tpo || '',
          status: row.status || '',
          prompt_flatlay: row.prompt_flatlay || '',
          created_at: row.created_at || '',
          updated_at: row.updated_at || '',
          items: [],
          avg_warmth: avgWarmth,
          temp_range_f: avgWarmth !== undefined ? warmthToTempRangeF(avgWarmth) : undefined,
          auto_seasons: avgWarmth !== undefined ? warmthToSeasons(avgWarmth) : [],
        };
      });

      setOutfits(outfitsData);
    } catch (error) {
      console.error('Failed to load outfits:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAllProducts(data?.map(p => ({
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
        formality: p.formality,
        warmth: p.warmth,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })) || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleOutfitSelect = (outfit: Outfit) => {
    setSelectedOutfit(outfit);
    setSelectedImage('flatlay');
    setPins(outfit.flatlay_pins || []);
    setSelectedPinIndex(null);
    setTpo(outfit.tpo || '');
  };

  const handleImageTypeChange = (type: ImageType) => {
    if (!selectedOutfit) return;

    setSelectedImage(type);
    const pinsKey = `${type}_pins` as keyof Outfit;
    setPins((selectedOutfit[pinsKey] as ImagePin[]) || []);
    setSelectedPinIndex(null);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newPin: ImagePin = { x, y, item: 'outer' };
    setPins([...pins, newPin]);
    setSelectedPinIndex(pins.length);
  };

  const handlePinItemChange = (index: number, item: ImagePin['item']) => {
    const newPins = [...pins];
    newPins[index].item = item;
    setPins(newPins);
  };

  const handlePinUrlChange = (index: number, url: string) => {
    const newPins = [...pins];
    newPins[index].url = url;
    setPins(newPins);
  };

  const handlePinDelete = (index: number) => {
    const newPins = pins.filter((_, i) => i !== index);
    setPins(newPins);
    setSelectedPinIndex(null);
  };

  const handleSave = async () => {
    if (!selectedOutfit) return;

    setSaving(true);
    try {
      console.log('Saving pins:', pins);
      console.log('Selected image:', selectedImage);
      console.log('Outfit ID:', selectedOutfit.id);
      console.log('TPO:', tpo);

      const updateData: Record<string, any> = {
        [`${selectedImage}_pins`]: pins,
        tpo: tpo || null,
      };

      console.log('Update data:', updateData);

      const { data, error } = await supabase
        .from('outfits')
        .update(updateData)
        .eq('id', selectedOutfit.id)
        .select();

      if (error) throw error;

      console.log('Save result:', data);

      // Verify the save by reading back from database
      const { data: verifyData, error: verifyError } = await supabase
        .from('outfits')
        .select(`${selectedImage}_pins, tpo`)
        .eq('id', selectedOutfit.id)
        .single();

      if (verifyError) throw verifyError;

      console.log('Verified data from DB:', verifyData);

      alert('저장되었습니다!');

      const updatedOutfits = outfits.map(o =>
        o.id === selectedOutfit.id
          ? { ...o, [`${selectedImage}_pins`]: pins, tpo: tpo || '' }
          : o
      );
      setOutfits(updatedOutfits);
      setSelectedOutfit({ ...selectedOutfit, [`${selectedImage}_pins`]: pins, tpo: tpo || '' });
    } catch (error) {
      console.error('Save error:', error);
      alert('저장 실패: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const getCurrentImageUrl = () => {
    if (!selectedOutfit) return '';
    if (selectedImage === 'flatlay') return selectedOutfit.image_url_flatlay;
    return selectedOutfit.image_url_on_model;
  };

  const getItemLabel = (item: string) => {
    const labels: Record<string, string> = {
      outer: '아우터',
      mid: '미드레이어',
      top: '상의',
      bottom: '하의',
      shoes: '신발',
      bag: '가방',
      accessory: '액세서리 1',
      accessory_2: '액세서리 2',
    };
    return labels[item] || item;
  };

  const getProductForSlot = (slotType: string): Product | undefined => {
    if (!selectedOutfit?.items) return undefined;
    const item = selectedOutfit.items.find(i => i.slot_type === slotType);
    return item?.product;
  };

  const handleProductSelect = (index: number, product: Product) => {
    const newPins = [...pins];
    newPins[index].product_id = product.id;
    newPins[index].url = product.affiliate_link || product.product_link;
    setPins(newPins);
    setShowProductsPanel(false);
  };

  const handlePinProductIdChange = (index: number, productId: string) => {
    const newPins = [...pins];
    newPins[index].product_id = productId;
    setPins(newPins);
  };

  const filteredOutfits = outfits.filter(outfit => {
    if (filterGender && outfit.gender !== filterGender) return false;
    if (filterBodyType && outfit.body_type !== filterBodyType) return false;
    if (filterVibe && outfit.vibe !== filterVibe) return false;
    if (filterSeason) {
      const autoSeasons = outfit.auto_seasons || [];
      if (!autoSeasons.includes(filterSeason)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">이미지 핀 관리자</h1>
          <p className="text-gray-600">이미지를 클릭하여 쇼핑 가능한 핀을 추가하세요</p>
        </div>

        {!selectedOutfit ? (
          <>
            <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-600 font-semibold">
                  총 {filteredOutfits.length}개의 코디 (전체: {outfits.length}개)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    성별
                  </label>
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">전체</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    체형
                  </label>
                  <select
                    value={filterBodyType}
                    onChange={(e) => setFilterBodyType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">전체</option>
                    <option value="slim">Slim</option>
                    <option value="regular">Regular</option>
                    <option value="plus-size">Plus-size</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    분위기
                  </label>
                  <select
                    value={filterVibe}
                    onChange={(e) => setFilterVibe(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">전체</option>
                    <option value="ELEVATED_COOL">Elevated Cool</option>
                    <option value="EFFORTLESS_NATURAL">Effortless Natural</option>
                    <option value="RETRO_LUXE">Retro Luxe</option>
                    <option value="SPORT_MODERN">Sport Modern</option>
                    <option value="CREATIVE_LAYERED">Creative Layered</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    계절
                  </label>
                  <select
                    value={filterSeason}
                    onChange={(e) => setFilterSeason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">전체</option>
                    <option value="spring">봄</option>
                    <option value="summer">여름</option>
                    <option value="fall">가을</option>
                    <option value="winter">겨울</option>
                  </select>
                </div>
              </div>
            </div>
            {filteredOutfits.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500 mb-4">
                  {outfits.length === 0 ? '등록된 코디가 없습니다' : '검색 결과가 없습니다'}
                </p>
                <p className="text-sm text-gray-400">
                  {outfits.length === 0 ? '데이터베이스에 코디를 추가해주세요' : '필터 조건을 변경해보세요'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredOutfits.map((outfit) => (
                  <div
                    key={outfit.id}
                    className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-200"
                  >
                    <button
                      onClick={() => handleOutfitSelect(outfit)}
                      className="w-full text-left"
                    >
                      <div className="relative aspect-square bg-gray-100">
                        {outfit.image_url_flatlay ? (
                          <img
                            src={outfit.image_url_flatlay}
                            alt={`${outfit.gender} - ${outfit.vibe}`}
                            className="absolute inset-0 w-full h-full object-contain p-1"
                            onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/300x300?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">이미지 없음</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="px-3 py-1.5 bg-white/90 rounded-full text-xs font-medium text-gray-800 shadow-sm">
                            핀 편집
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="px-2 py-2 space-y-1">
                      <p className="text-[11px] text-gray-700 font-medium leading-tight truncate">
                        {outfit.gender} · {outfit.body_type} · {outfit.vibe}
                      </p>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400 truncate">
                          {outfit.status || '-'}
                        </span>
                      </div>
                      {outfit.avg_warmth !== undefined && (
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium w-fit ${getWarmthColor(outfit.avg_warmth)}`}>
                          <Thermometer size={9} />
                          <span>보온 {outfit.avg_warmth.toFixed(1)} · {getWarmthLabel(outfit.avg_warmth)}</span>
                        </div>
                      )}
                      {outfit.temp_range_f && (
                        <div className="flex items-center gap-1 text-[9px] text-gray-500">
                          <span className="font-medium text-gray-600">{outfit.temp_range_f.min}–{outfit.temp_range_f.max}°F</span>
                          <span className="text-gray-300">|</span>
                          <div className="flex items-center gap-0.5">
                            {(outfit.auto_seasons || []).map(s => (
                              <span key={s} className="flex items-center gap-0.5">
                                <SeasonIcon season={s} />
                                <span>{SEASON_LABELS[s]}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {outfit.avg_warmth === undefined && (
                        <div className="flex items-center gap-1 text-[9px] text-gray-400 italic">
                          <Thermometer size={9} />
                          <span>제품 연결 후 계산</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedOutfit(null)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
                뒤로 가기
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowProductsPanel(!showProductsPanel)}
                  className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  <Package size={18} />
                  Products ({selectedOutfit.items?.length || 0})
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={18} />
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>

            <div className="mb-6 bg-purple-50 rounded-lg p-4 border border-purple-200">
              <label className="block text-sm font-semibold text-purple-900 mb-2">
                TPO (Time, Place, Occasion)
              </label>
              <select
                value={tpo}
                onChange={(e) => setTpo(e.target.value)}
                className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">선택 안 함 (TPO 미표시)</option>
                <option value="WORK">WORK</option>
                <option value="DATE">DATE</option>
                <option value="WEEKEND">WEEKEND</option>
                <option value="INTERVIEW">INTERVIEW</option>
              </select>
              <p className="text-xs text-purple-700 mt-2">
                TPO를 선택하면 이미지 우측 상단에 표시됩니다. 선택하지 않으면 표시되지 않습니다.
              </p>
            </div>

            {showProductsPanel && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Outfit Products</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">현재 연결된 제품</h4>
                    {!selectedOutfit.items || selectedOutfit.items.length === 0 ? (
                      <p className="text-sm text-gray-500">연결된 제품이 없습니다.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedOutfit.items.map((item) => (
                          <div key={item.id} className="bg-white rounded p-3 flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {getItemLabel(item.slot_type)}: {item.product?.brand} - {item.product?.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {item.product?.color} · ${item.product?.price}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">모든 제품 - Vibe 호환순 ({allProducts.filter(p => p.gender === selectedOutfit.gender).length})</h4>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {allProducts
                        .filter(p => p.gender === selectedOutfit.gender)
                        .map(p => ({ ...p, _vs: scoreProductForVibe(p, selectedOutfit.vibe) }))
                        .sort((a, b) => b._vs.total - a._vs.total)
                        .map((product) => (
                          <div key={product.id} className="bg-white rounded p-3 border border-gray-200">
                            <div className="flex items-start gap-3">
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-16 h-16 object-cover rounded"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-900">
                                    {getItemLabel(product.category)}: {product.brand}
                                  </p>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                    product._vs.total >= 70 ? 'bg-emerald-100 text-emerald-700' :
                                    product._vs.total >= 50 ? 'bg-blue-100 text-blue-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {product._vs.total}점
                                  </span>
                                  <span className="text-[9px] text-gray-400">
                                    {COLOR_TIER_LABELS[product._vs.colorTier]}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600">{product.name}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {product.color} · ${product.price}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => handleImageTypeChange('flatlay')}
                  className={`px-4 py-2 rounded-lg ${
                    selectedImage === 'flatlay'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  플랫레이
                </button>
                <button
                  onClick={() => handleImageTypeChange('on_model')}
                  className={`px-4 py-2 rounded-lg ${
                    selectedImage === 'on_model'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  착용 사진
                </button>
              </div>

              <div className="relative inline-block max-w-full">
                <div
                  ref={imageRef}
                  onClick={handleImageClick}
                  className="relative cursor-crosshair"
                  style={{ maxWidth: '800px' }}
                >
                  <img
                    src={getCurrentImageUrl()}
                    alt="outfit"
                    className="w-full rounded-lg"
                    draggable={false}
                  />

                  {pins.map((pin, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPinIndex(index);
                      }}
                      className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-white font-bold transform -translate-x-1/2 -translate-y-1/2 transition-transform ${
                        selectedPinIndex === index
                          ? 'bg-red-500 scale-125'
                          : 'bg-blue-500 hover:scale-110'
                      }`}
                      style={{
                        left: `${pin.x}%`,
                        top: `${pin.y}%`,
                      }}
                    >
                      +
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {selectedPinIndex !== null && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">
                    핀 #{selectedPinIndex + 1} 설정
                  </h3>
                  <button
                    onClick={() => handlePinDelete(selectedPinIndex)}
                    className="text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <X size={16} />
                    삭제
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      연결할 아이템
                    </label>
                    <select
                      value={pins[selectedPinIndex].item}
                      onChange={(e) =>
                        handlePinItemChange(
                          selectedPinIndex,
                          e.target.value as ImagePin['item']
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="outer">아우터</option>
                      <option value="top">상의</option>
                      <option value="bottom">하의</option>
                      <option value="shoes">신발</option>
                      <option value="bag">가방</option>
                      <option value="accessory">액세서리</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      연결할 제품
                    </label>
                    <RankedProductSelect
                      products={allProducts}
                      gender={selectedOutfit.gender}
                      category={pins[selectedPinIndex].item}
                      vibeKey={selectedOutfit.vibe}
                      selectedId={pins[selectedPinIndex].product_id || ''}
                      onChange={(productId) => {
                        const product = allProducts.find(p => p.id === productId);
                        if (product) {
                          handleProductSelect(selectedPinIndex, product);
                        } else {
                          handlePinProductIdChange(selectedPinIndex, '');
                        }
                      }}
                    />
                    {pins[selectedPinIndex].product_id && (() => {
                      const product = allProducts.find(p => p.id === pins[selectedPinIndex].product_id);
                      return product ? (
                        <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                          <p className="text-green-800 font-medium">
                            {product.brand} - {product.name}
                          </p>
                          <p className="text-green-600 mt-1">
                            {product.color} · ${product.price}
                          </p>
                          {product.affiliate_link && (
                            <p className="text-green-700 mt-1 font-medium">
                              Amazon Affiliate Link
                            </p>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      쇼핑 링크 URL (수동 입력)
                    </label>
                    <input
                      type="url"
                      value={(() => {
                        const pin = pins[selectedPinIndex];
                        if (pin.url) return pin.url;
                        if (pin.product_id) {
                          const product = allProducts.find(p => p.id === pin.product_id);
                          if (product) {
                            return product.affiliate_link || product.product_link || '';
                          }
                        }
                        return '';
                      })()}
                      onChange={(e) => handlePinUrlChange(selectedPinIndex, e.target.value)}
                      placeholder="https://example.com/product"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      제품을 선택하면 자동으로 채워집니다
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">핀 목록</h3>
              {pins.length === 0 ? (
                <p className="text-blue-700 text-sm">
                  이미지를 클릭하여 핀을 추가하세요
                </p>
              ) : (
                <div className="space-y-2">
                  {pins.map((pin, index) => {
                    const displayUrl = pin.url || (pin.product_id ? (() => {
                      const product = allProducts.find(p => p.id === pin.product_id);
                      return product ? (product.affiliate_link || product.product_link || '') : '';
                    })() : '');

                    return (
                      <div
                        key={index}
                        className="bg-white rounded p-2"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">
                            핀 #{index + 1}: {getItemLabel(pin.item)}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({pin.x.toFixed(1)}%, {pin.y.toFixed(1)}%)
                          </span>
                        </div>
                        {displayUrl && (
                          <div className="text-xs text-blue-600 truncate">
                            URL: {displayUrl}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

interface RankedProductSelectProps {
  products: Product[];
  gender: string;
  category: string;
  vibeKey: string;
  selectedId: string;
  onChange: (productId: string) => void;
}

function RankedProductSelect({ products, gender, category, vibeKey, selectedId, onChange }: RankedProductSelectProps) {
  const rankedProducts = useMemo(() => {
    const filtered = products.filter(p => p.gender === gender && p.category === category);
    if (!vibeKey) return filtered.map(p => ({ product: p, score: null as VibeCompatScore | null }));
    return filtered
      .map(p => ({ product: p, score: scoreProductForVibe(p, vibeKey) }))
      .sort((a, b) => (b.score?.total ?? 0) - (a.score?.total ?? 0));
  }, [products, gender, category, vibeKey]);

  return (
    <select
      value={selectedId}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2 text-sm"
    >
      <option value="">제품 선택 (Vibe 호환순)...</option>
      {rankedProducts.map(({ product, score }) => (
        <option key={product.id} value={product.id}>
          {score ? `[${score.total}점 ${COLOR_TIER_LABELS[score.colorTier]}] ` : ''}
          {product.brand} - {product.name}
          {product.affiliate_link ? ' (Affiliate)' : ''}
        </option>
      ))}
    </select>
  );
}
