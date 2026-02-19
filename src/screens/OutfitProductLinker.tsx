import { useState, useEffect, useRef, useCallback } from 'react';
import { Outfit, Product, OutfitItem } from '../data/outfits';
import { supabase } from '../utils/supabase';
import { X, Plus, Trash2, Image as ImageIcon, Send, RefreshCw, Loader, Download } from 'lucide-react';
import { reviseModelPhoto } from '../utils/modelPhotoGenerator';
import { downloadHighQualityImage } from '../utils/imageCompression';
import FlatlayRenderer from './FlatlayRenderer';

interface OutfitProductLinkerProps {
  outfit: Outfit;
  onClose: () => void;
  onLinksUpdated: () => void;
}

const SLOT_TYPES = [
  { value: 'outer', label: '아우터' },
  { value: 'mid', label: '미드레이어' },
  { value: 'top', label: '상의' },
  { value: 'bottom', label: '하의' },
  { value: 'shoes', label: '신발' },
  { value: 'bag', label: '가방' },
  { value: 'accessory', label: '액세서리 1' },
  { value: 'accessory_2', label: '액세서리 2' },
];

const PRODUCT_CATEGORIES = [
  { value: 'outer', label: '아우터' },
  { value: 'mid', label: '미드레이어' },
  { value: 'top', label: '상의' },
  { value: 'bottom', label: '하의' },
  { value: 'shoes', label: '신발' },
  { value: 'bag', label: '가방' },
  { value: 'accessory', label: '액세서리' },
];

export default function OutfitProductLinker({ outfit, onClose, onLinksUpdated }: OutfitProductLinkerProps) {
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [linkedItems, setLinkedItems] = useState<OutfitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedProduct, setDraggedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showRenderer, setShowRenderer] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [modelRevisionText, setModelRevisionText] = useState('');
  const [modelRevising, setModelRevising] = useState(false);
  const [modelRevisionError, setModelRevisionError] = useState('');
  const [currentModelUrl, setCurrentModelUrl] = useState(outfit.image_url_on_model);
  const [currentCleanUrl, setCurrentCleanUrl] = useState(outfit.image_url_flatlay_clean || '');
  const [downloadingFlatlay, setDownloadingFlatlay] = useState(false);
  const [downloadingModel, setDownloadingModel] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current !== null) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, []);

  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const container = scrollContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const edgeZone = 80;
    const y = e.clientY;

    stopAutoScroll();

    if (y < rect.top + edgeZone) {
      const intensity = 1 - (y - rect.top) / edgeZone;
      const speed = Math.max(4, intensity * 20);
      const scroll = () => {
        container.scrollTop -= speed;
        autoScrollRef.current = requestAnimationFrame(scroll);
      };
      autoScrollRef.current = requestAnimationFrame(scroll);
    } else if (y > rect.bottom - edgeZone) {
      const intensity = 1 - (rect.bottom - y) / edgeZone;
      const speed = Math.max(4, intensity * 20);
      const scroll = () => {
        container.scrollTop += speed;
        autoScrollRef.current = requestAnimationFrame(scroll);
      };
      autoScrollRef.current = requestAnimationFrame(scroll);
    }
  }, [stopAutoScroll]);

  useEffect(() => {
    loadData();
  }, [outfit.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsResult, itemsResult] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('gender', outfit.gender)
          .order('created_at', { ascending: false }),
        supabase
          .from('outfit_items')
          .select(`
            *,
            product:products(*)
          `)
          .eq('outfit_id', outfit.id)
      ]);

      if (productsResult.error) throw productsResult.error;
      if (itemsResult.error) throw itemsResult.error;

      setAvailableProducts(productsResult.data?.map(p => ({
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
        created_at: p.created_at,
        updated_at: p.updated_at,
      })) || []);

      setLinkedItems(itemsResult.data?.map((item: any) => ({
        id: item.id,
        outfit_id: item.outfit_id,
        product_id: item.product_id,
        slot_type: item.slot_type,
        created_at: item.created_at,
        product: item.product ? {
          id: item.product.id,
          brand: item.product.brand,
          name: item.product.name,
          category: item.product.category,
          gender: item.product.gender,
          body_type: item.product.body_type || [],
          vibe: item.product.vibe || [],
          color: item.product.color || '',
          season: item.product.season || [],
          silhouette: item.product.silhouette || '',
          image_url: item.product.image_url,
          product_link: item.product.product_link || '',
          affiliate_link: item.product.affiliate_link || '',
          price: item.product.price,
          stock_status: item.product.stock_status || 'in_stock',
          created_at: item.product.created_at,
          updated_at: item.product.updated_at,
        } : undefined
      })) || []);
    } catch (error) {
      console.error('Load error:', error);
      alert('데이터 로드 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (product: Product) => {
    setDraggedProduct(product);
  };

  const handleDragEnd = () => {
    setDraggedProduct(null);
    setDragOverSlot(null);
    stopAutoScroll();
  };

  const handleDrop = async (slotType: string) => {
    if (!draggedProduct) return;

    setSaving(true);
    try {
      const existingItem = linkedItems.find(item => item.slot_type === slotType);
      if (existingItem) {
        await supabase
          .from('outfit_items')
          .delete()
          .eq('id', existingItem.id);
      }

      const { error } = await supabase
        .from('outfit_items')
        .insert([{
          outfit_id: outfit.id,
          product_id: draggedProduct.id,
          slot_type: slotType
        }]);

      if (error) throw error;

      await loadData();
      onLinksUpdated();
    } catch (error) {
      console.error('Link error:', error);
      alert('연결 실패: ' + (error as Error).message);
    } finally {
      setSaving(false);
      setDraggedProduct(null);
    }
  };

  const handleRemoveLink = async (itemId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('outfit_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      await loadData();
      onLinksUpdated();
    } catch (error) {
      console.error('Remove error:', error);
      alert('제거 실패: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const refreshOutfitImages = async () => {
    const { data } = await supabase
      .from('outfits')
      .select('image_url_on_model, image_url_flatlay_clean')
      .eq('id', outfit.id)
      .maybeSingle();
    if (data) {
      setCurrentModelUrl(data.image_url_on_model || '');
      setCurrentCleanUrl(data.image_url_flatlay_clean || '');
    }
  };

  const handleModelRevision = async () => {
    if (!modelRevisionText.trim() || !currentModelUrl || !currentCleanUrl) return;

    setModelRevising(true);
    setModelRevisionError('');

    try {
      const newModelUrl = await reviseModelPhoto(
        outfit.id, currentCleanUrl, currentModelUrl, modelRevisionText.trim()
      );
      setCurrentModelUrl(newModelUrl);
      setModelRevisionText('');
      onLinksUpdated();
    } catch (err) {
      console.error('Model revision error:', err);
      setModelRevisionError((err as Error).message);
    } finally {
      setModelRevising(false);
    }
  };

  const handleDownloadFlatlay = async () => {
    if (!outfit.image_url_flatlay) return;
    setDownloadingFlatlay(true);
    try {
      await downloadHighQualityImage(
        outfit.image_url_flatlay,
        `flatlay_${outfit.id}.png`,
        import.meta.env.VITE_SUPABASE_URL
      );
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingFlatlay(false);
    }
  };

  const handleDownloadModel = async () => {
    if (!currentModelUrl) return;
    setDownloadingModel(true);
    try {
      await downloadHighQualityImage(
        currentModelUrl,
        `model_${outfit.id}.png`,
        import.meta.env.VITE_SUPABASE_URL
      );
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingModel(false);
    }
  };

  const getSlotItem = (slotType: string): OutfitItem | undefined => {
    return linkedItems.find(item => item.slot_type === slotType);
  };

  const filteredProducts = availableProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-gray-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={scrollContainerRef}
        onDragOver={handleContainerDragOver}
        onDragLeave={stopAutoScroll}
        onDrop={stopAutoScroll}
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">코디 - 제품 연결</h2>
            <p className="text-sm text-gray-600 mt-1">
              제품을 슬롯으로 드래그하여 연결하세요
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">코디 슬롯</h3>
              <div className="text-sm text-gray-500 mb-3">
                {outfit.gender} · {outfit.body_type} · {outfit.vibe}
              </div>

              <div className="space-y-3">
                {SLOT_TYPES.map(slot => {
                  const item = getSlotItem(slot.value);
                  return (
                    <div
                      key={slot.value}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (dragOverSlot !== slot.value) setDragOverSlot(slot.value);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverSlot(null);
                        handleDrop(slot.value);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        setDragOverSlot(slot.value);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        if (dragOverSlot === slot.value) setDragOverSlot(null);
                      }}
                      className={`border-2 border-dashed rounded-lg p-4 transition-all ${
                        dragOverSlot === slot.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{slot.label}</h4>
                        {item && (
                          <button
                            onClick={() => handleRemoveLink(item.id)}
                            disabled={saving}
                            className="text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {item?.product ? (
                        <div className="flex items-start gap-3 bg-white rounded p-3">
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {item.product.brand}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {item.product.name}
                            </p>
                            {item.product.price && (
                              <p className="text-xs text-gray-500 mt-1">
                                ${item.product.price.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-400 text-sm">
                          <Plus size={24} className="mx-auto mb-1 opacity-50" />
                          제품을 드래그하여 연결
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {(outfit.image_url_flatlay || currentModelUrl) && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">생성된 이미지</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {outfit.image_url_flatlay && (
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs text-gray-500 font-medium">플랫레이</p>
                          <button
                            onClick={handleDownloadFlatlay}
                            disabled={downloadingFlatlay}
                            title="고화질 PNG 다운로드"
                            className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                          >
                            {downloadingFlatlay
                              ? <Loader className="animate-spin" size={12} />
                              : <Download size={12} />}
                          </button>
                        </div>
                        <img
                          src={outfit.image_url_flatlay}
                          alt="Flatlay"
                          className="w-full rounded object-contain"
                        />
                      </div>
                    )}
                    {currentModelUrl && (
                      <div className="bg-gray-50 rounded-lg p-2 relative">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs text-gray-500 font-medium">모델컷</p>
                          <button
                            onClick={handleDownloadModel}
                            disabled={downloadingModel || modelRevising}
                            title="고화질 PNG 다운로드"
                            className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                          >
                            {downloadingModel
                              ? <Loader className="animate-spin" size={12} />
                              : <Download size={12} />}
                          </button>
                        </div>
                        {modelRevising && (
                          <div className="absolute inset-0 bg-white bg-opacity-80 rounded-lg flex items-center justify-center z-10">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Loader className="animate-spin" size={18} />
                              <span className="text-xs font-medium">수정 중...</span>
                            </div>
                          </div>
                        )}
                        <img
                          src={currentModelUrl}
                          alt="Model"
                          className="w-full rounded object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {currentModelUrl && currentCleanUrl && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <RefreshCw size={14} className="text-gray-600" />
                        <h5 className="text-xs font-semibold text-gray-700">모델컷 AI 수정</h5>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={modelRevisionText}
                          onChange={(e) => setModelRevisionText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !modelRevising) handleModelRevision(); }}
                          placeholder="예: 포즈를 바꿔줘, 코트를 열어줘..."
                          disabled={modelRevising}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                        />
                        <button
                          onClick={handleModelRevision}
                          disabled={modelRevising || !modelRevisionText.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
                        >
                          {modelRevising ? <Loader className="animate-spin" size={14} /> : <Send size={14} />}
                          수정
                        </button>
                      </div>
                      {modelRevisionError && (
                        <p className="text-xs text-red-600 mt-1.5">{modelRevisionError}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">제품 목록</h3>

              <div className="mb-4 space-y-2">
                <input
                  type="text"
                  placeholder="제품명 또는 브랜드 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">전체 카테고리</option>
                  {PRODUCT_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    제품이 없습니다
                  </div>
                ) : (
                  filteredProducts.map(product => (
                    <div
                      key={product.id}
                      draggable={true}
                      onDragStart={(e) => {
                        handleDragStart(product);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', product.id);
                      }}
                      onDragEnd={handleDragEnd}
                      className={`flex items-start gap-3 bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-blue-500 hover:shadow-md transition-all ${
                        draggedProduct?.id === product.id ? 'opacity-50 scale-95' : ''
                      }`}
                    >
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm">
                              {product.brand}
                            </p>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {product.name}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded whitespace-nowrap">
                            {PRODUCT_CATEGORIES.find(c => c.value === product.category)?.label}
                          </span>
                        </div>
                        {product.price && (
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            ${product.price.toLocaleString()}
                          </p>
                        )}
                        {product.vibe && product.vibe.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {product.vibe.slice(0, 2).map((v, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t flex justify-between items-center">
            <button
              onClick={() => setShowRenderer(true)}
              disabled={linkedItems.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <ImageIcon size={18} />
              플랫레이 렌더링
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              완료
            </button>
          </div>
        </div>
      </div>

      {showRenderer && (
        <FlatlayRenderer
          outfitId={outfit.id}
          onClose={() => setShowRenderer(false)}
          onRendered={() => {
            setShowRenderer(false);
            refreshOutfitImages();
            onLinksUpdated();
          }}
        />
      )}
    </div>
  );
}
