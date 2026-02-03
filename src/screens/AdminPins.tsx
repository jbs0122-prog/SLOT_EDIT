import { useState, useEffect, useRef } from 'react';
import { Outfit, ImagePin, Product } from '../data/outfits';
import { supabase } from '../utils/supabase';
import { X, Save, ArrowLeft, Package } from 'lucide-react';

type ImageType = 'flatlay' | 'on_model';

export default function AdminPins() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageType>('flatlay');
  const [pins, setPins] = useState<ImagePin[]>([]);
  const [selectedPinIndex, setSelectedPinIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [showProductsPanel, setShowProductsPanel] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadOutfits();
    loadProducts();
  }, []);

  const loadOutfits = async () => {
    try {
      const { data, error } = await supabase
        .from('outfits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const outfitsData: Outfit[] = data?.map(row => ({
        id: row.id,
        gender: row.gender,
        body_type: row.body_type,
        vibe: row.vibe,
        image_url_flatlay: row.image_url_flatlay || '',
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
      })) || [];

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
        price: p.price,
        stock_status: p.stock_status || 'in_stock',
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

      const updateData: Record<string, ImagePin[]> = {
        [`${selectedImage}_pins`]: pins,
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
        .select(`${selectedImage}_pins`)
        .eq('id', selectedOutfit.id)
        .single();

      if (verifyError) throw verifyError;

      console.log('Verified data from DB:', verifyData);

      alert('저장되었습니다!');

      const updatedOutfits = outfits.map(o =>
        o.id === selectedOutfit.id
          ? { ...o, [`${selectedImage}_pins`]: pins }
          : o
      );
      setOutfits(updatedOutfits);
      setSelectedOutfit({ ...selectedOutfit, [`${selectedImage}_pins`]: pins });
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
      top: '상의',
      bottom: '하의',
      shoes: '신발',
      bag: '가방',
      accessory: '액세서리'
    };
    return labels[item] || item;
  };

  const getProductForSlot = (slotType: string): Product | undefined => {
    if (!selectedOutfit?.items) return undefined;
    const item = selectedOutfit.items.find(i => i.slot_type === slotType);
    return item?.product;
  };

  const handleProductSelect = (index: number, product: Product) => {
    handlePinUrlChange(index, product.product_link);
  };

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
            <div className="mb-4 flex items-center justify-between">
              <p className="text-gray-600">
                총 {outfits.length}개의 코디
              </p>
              <a
                href="#admin-products"
                className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                <Package size={18} />
                제품 관리
              </a>
            </div>
            {outfits.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500 mb-4">등록된 코디가 없습니다</p>
                <p className="text-sm text-gray-400">데이터베이스에 코디를 추가해주세요</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {outfits.map((outfit) => (
                  <button
                    key={outfit.id}
                    onClick={() => handleOutfitSelect(outfit)}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 text-left"
                  >
                    {outfit.image_url_flatlay ? (
                      <img
                        src={outfit.image_url_flatlay}
                        alt={`${outfit.gender} - ${outfit.vibe}`}
                        className="w-full h-48 object-cover rounded-lg mb-3"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                        <span className="text-gray-400">이미지 없음</span>
                      </div>
                    )}
                    <div className="text-sm text-gray-600">
                      {outfit.gender} · {outfit.body_type} · {outfit.vibe}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      ID: {outfit.id.slice(0, 8)} · {outfit.status}
                    </div>
                  </button>
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
                    <h4 className="text-sm font-medium text-gray-700 mb-2">모든 제품 ({allProducts.length})</h4>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {allProducts
                        .filter(p => p.gender === selectedOutfit.gender)
                        .map((product) => (
                          <div key={product.id} className="bg-white rounded p-3 border border-gray-200">
                            <div className="flex items-start gap-3">
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-16 h-16 object-cover rounded"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {getItemLabel(product.category)}: {product.brand}
                                </p>
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
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm text-gray-600">
                        쇼핑 링크 URL
                      </label>
                      {(() => {
                        const product = getProductForSlot(pins[selectedPinIndex].item);
                        return product ? (
                          <button
                            onClick={() => handleProductSelect(selectedPinIndex, product)}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                          >
                            {product.brand} {product.name} 링크 사용
                          </button>
                        ) : null;
                      })()}
                    </div>
                    <input
                      type="url"
                      value={pins[selectedPinIndex].url || ''}
                      onChange={(e) => handlePinUrlChange(selectedPinIndex, e.target.value)}
                      placeholder="https://example.com/product"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {(() => {
                      const product = getProductForSlot(pins[selectedPinIndex].item);
                      return product ? (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                          <p className="text-green-800 font-medium">
                            연결된 제품: {product.brand} - {product.name}
                          </p>
                          <p className="text-green-600 mt-1">
                            {product.color} · ${product.price}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-orange-600 mt-1">
                          ⚠ 이 슬롯에 연결된 제품이 없습니다. Products 패널에서 제품을 추가하세요.
                        </p>
                      );
                    })()}
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
                  {pins.map((pin, index) => (
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
                      {pin.url && (
                        <div className="text-xs text-blue-600 truncate">
                          URL: {pin.url}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
