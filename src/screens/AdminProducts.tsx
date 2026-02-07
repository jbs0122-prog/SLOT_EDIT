import { useState, useEffect } from 'react';
import { Product, Outfit } from '../data/outfits';
import { supabase } from '../utils/supabase';
import ProductForm from './ProductForm';
import ProductList from './ProductList';
import CSVUpload from './CSVUpload';
import OutfitProductLinker from './OutfitProductLinker';
import AutoOutfitGenerator from './AutoOutfitGenerator';
import { Plus, Upload, Link as LinkIcon, Package, Pin, Sparkles, Trash2, Users, Key } from 'lucide-react';

type ViewMode = 'products' | 'outfits';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('products');

  const [showProductForm, setShowProductForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showOutfitLinker, setShowOutfitLinker] = useState(false);
  const [showAutoGenerator, setShowAutoGenerator] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [filterVibe, setFilterVibe] = useState('all');

  const [outfitFilterGender, setOutfitFilterGender] = useState('');
  const [outfitFilterBodyType, setOutfitFilterBodyType] = useState('');
  const [outfitFilterVibe, setOutfitFilterVibe] = useState('');
  const [productUsageCounts, setProductUsageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadProducts();
    loadOutfits();
    loadProductUsageCounts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProducts(data?.map(p => ({
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
      } as Product)) || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      alert('제품 로드 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const loadProductUsageCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('outfit_items')
        .select('product_id');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(item => {
        if (item.product_id) {
          counts[item.product_id] = (counts[item.product_id] || 0) + 1;
        }
      });

      setProductUsageCounts(counts);
    } catch (error) {
      console.error('Failed to load product usage counts:', error);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleProductFormClose = () => {
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleProductSaved = () => {
    loadProducts();
    handleProductFormClose();
  };

  const handleCSVUploadComplete = () => {
    loadProducts();
    setShowCSVUpload(false);
  };

  const handleLinkOutfit = (outfit: Outfit) => {
    setSelectedOutfit(outfit);
    setShowOutfitLinker(true);
  };

  const handleLinkerClose = () => {
    setShowOutfitLinker(false);
    setSelectedOutfit(null);
  };

  const handleLinksUpdated = () => {
    loadOutfits();
    loadProductUsageCounts();
  };

  const handleDeleteOutfit = async (outfitId: string) => {
    if (!confirm('이 코디를 삭제하시겠습니까? 연결된 제품 정보도 함께 삭제됩니다.')) {
      return;
    }

    setLoading(true);
    try {
      await supabase
        .from('outfit_items')
        .delete()
        .eq('outfit_id', outfitId);

      const { error } = await supabase
        .from('outfits')
        .delete()
        .eq('id', outfitId);

      if (error) throw error;

      await loadOutfits();
      await loadProductUsageCounts();
      alert('코디가 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete outfit:', error);
      alert('코디 삭제 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const matchesGender = filterGender === 'all' || product.gender === filterGender;
    const matchesVibe = filterVibe === 'all' || product.vibe.includes(filterVibe);
    return matchesSearch && matchesCategory && matchesGender && matchesVibe;
  });

  const filteredOutfits = outfits.filter(outfit => {
    if (outfitFilterGender && outfit.gender !== outfitFilterGender) return false;
    if (outfitFilterBodyType && outfit.body_type !== outfitFilterBodyType) return false;
    if (outfitFilterVibe && outfit.vibe !== outfitFilterVibe) return false;
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">제품 관리자</h1>
            <p className="text-gray-600">제품을 추가하고 코디와 연결하세요</p>
          </div>
          <div className="flex gap-2">
            <a
              href="#test-gemini"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 shadow-md"
            >
              <Key size={18} />
              API 테스트
            </a>
            <a
              href="#admin-users"
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              <Users size={18} />
              회원 관리
            </a>
            <a
              href="#admin"
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              <Pin size={18} />
              핀 관리
            </a>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('products')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'products'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Package size={18} className="inline mr-2" />
              제품 관리
            </button>
            <button
              onClick={() => setViewMode('outfits')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'outfits'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <LinkIcon size={18} className="inline mr-2" />
              코디 연결
            </button>
          </div>

          {viewMode === 'products' && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowCSVUpload(true)}
                className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                <Upload size={18} />
                CSV 업로드
              </button>
              <button
                onClick={handleAddProduct}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus size={18} />
                제품 추가
              </button>
            </div>
          )}
        </div>

        {viewMode === 'products' ? (
          <>
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="제품명 또는 브랜드 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">전체 카테고리</option>
                  <option value="outer">아우터</option>
                  <option value="top">상의</option>
                  <option value="bottom">하의</option>
                  <option value="shoes">신발</option>
                  <option value="bag">가방</option>
                  <option value="accessory">액세서리</option>
                </select>
                <select
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">전체 성별</option>
                  <option value="MALE">남성</option>
                  <option value="FEMALE">여성</option>
                  <option value="UNISEX">유니섹스</option>
                </select>
                <select
                  value={filterVibe}
                  onChange={(e) => setFilterVibe(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">전체 스타일</option>
                  <option value="ELEVATED_COOL">Elevated Cool</option>
                  <option value="EFFORTLESS_NATURAL">Effortless Natural</option>
                  <option value="ARTISTIC_MINIMAL">Artistic Minimal</option>
                  <option value="RETRO_LUXE">Retro Luxe</option>
                  <option value="SPORT_MODERN">Sport Modern</option>
                  <option value="CREATIVE_LAYERED">Creative Layered</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  제품 목록 ({filteredProducts.length})
                </h2>
              </div>
              <ProductList
                products={filteredProducts}
                onProductsChange={loadProducts}
                onEditProduct={handleEditProduct}
                usageCounts={productUsageCounts}
              />
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    성별
                  </label>
                  <select
                    value={outfitFilterGender}
                    onChange={(e) => setOutfitFilterGender(e.target.value)}
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
                    value={outfitFilterBodyType}
                    onChange={(e) => setOutfitFilterBodyType(e.target.value)}
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
                    value={outfitFilterVibe}
                    onChange={(e) => setOutfitFilterVibe(e.target.value)}
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
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    코디 목록 ({filteredOutfits.length}개 / 전체 {outfits.length}개)
                  </h2>
                  <p className="text-sm text-gray-600">
                    코디를 선택하여 제품을 연결하세요
                  </p>
                </div>
                <button
                  onClick={() => setShowAutoGenerator(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-md"
                >
                  <Sparkles size={18} />
                  자동 생성
                </button>
              </div>
              {filteredOutfits.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {outfits.length === 0 ? '등록된 코디가 없습니다' : '검색 결과가 없습니다'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOutfits.map((outfit) => (
                  <div
                    key={outfit.id}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden relative"
                  >
                    <button
                      onClick={() => handleDeleteOutfit(outfit.id)}
                      className="absolute top-2 right-2 z-10 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-md"
                      title="코디 삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                    {outfit.image_url_flatlay ? (
                      <img
                        src={outfit.image_url_flatlay}
                        alt={`${outfit.gender} - ${outfit.vibe}`}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400">이미지 없음</span>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="text-sm text-gray-600 mb-2">
                        {outfit.gender} · {outfit.body_type} · {outfit.vibe}
                      </div>
                      <div className="text-xs text-gray-400 mb-3">
                        연결된 제품: {outfit.items?.length || 0}개 · {outfit.status}
                      </div>
                      <button
                        onClick={() => handleLinkOutfit(outfit)}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        <LinkIcon size={16} />
                        제품 연결
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </>
        )}
      </div>

      {showProductForm && (
        <ProductForm
          product={editingProduct}
          onSave={handleProductSaved}
          onCancel={handleProductFormClose}
        />
      )}

      {showCSVUpload && (
        <CSVUpload
          onUploadComplete={handleCSVUploadComplete}
          onCancel={() => setShowCSVUpload(false)}
        />
      )}

      {showOutfitLinker && selectedOutfit && (
        <OutfitProductLinker
          outfit={selectedOutfit}
          onClose={handleLinkerClose}
          onLinksUpdated={handleLinksUpdated}
        />
      )}

      {showAutoGenerator && (
        <AutoOutfitGenerator
          onClose={() => setShowAutoGenerator(false)}
          onGenerated={() => {
            loadOutfits();
            setShowAutoGenerator(false);
          }}
        />
      )}
    </div>
  );
}
