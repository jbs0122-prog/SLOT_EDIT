import { useState, useEffect } from 'react';
import { Product } from '../data/outfits';
import { supabase } from '../utils/supabase';
import ProductForm from './ProductForm';
import ProductList from './ProductList';
import CSVUpload from './CSVUpload';
import VibeQualityDashboard from './VibeQualityDashboard';
import { Plus, Upload } from 'lucide-react';

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [showProductForm, setShowProductForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const FILTER_KEY = 'admin_products_filters';

  const loadSavedFilters = () => {
    try {
      const raw = sessionStorage.getItem(FILTER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const savedFilters = loadSavedFilters();

  const [searchTerm, setSearchTermRaw] = useState<string>(savedFilters?.searchTerm ?? '');
  const [filterCategory, setFilterCategoryRaw] = useState<string>(savedFilters?.filterCategory ?? 'all');
  const [filterGender, setFilterGenderRaw] = useState<string>(savedFilters?.filterGender ?? 'all');
  const [filterBodyType, setFilterBodyTypeRaw] = useState<string>(savedFilters?.filterBodyType ?? 'all');
  const [filterVibe, setFilterVibeRaw] = useState<string>(savedFilters?.filterVibe ?? 'all');
  const [filterSeason, setFilterSeasonRaw] = useState<string>(savedFilters?.filterSeason ?? 'all');
  const [filterUnused, setFilterUnused] = useState(false);

  const saveFilters = (updates: Partial<{ searchTerm: string; filterCategory: string; filterGender: string; filterBodyType: string; filterVibe: string; filterSeason: string }>) => {
    try {
      const current = loadSavedFilters() || {};
      sessionStorage.setItem(FILTER_KEY, JSON.stringify({ ...current, ...updates }));
    } catch { /* ignore */ }
  };

  const setSearchTerm = (v: string) => { setSearchTermRaw(v); saveFilters({ searchTerm: v }); };
  const setFilterCategory = (v: string) => { setFilterCategoryRaw(v); saveFilters({ filterCategory: v }); };
  const setFilterGender = (v: string) => { setFilterGenderRaw(v); saveFilters({ filterGender: v }); };
  const setFilterBodyType = (v: string) => { setFilterBodyTypeRaw(v); saveFilters({ filterBodyType: v }); };
  const setFilterVibe = (v: string) => { setFilterVibeRaw(v); saveFilters({ filterVibe: v }); };
  const setFilterSeason = (v: string) => { setFilterSeasonRaw(v); saveFilters({ filterSeason: v }); };

  const [productUsageCounts, setProductUsageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadProducts();
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

  const filteredProducts = products.filter(product => {
    if (filterUnused && productUsageCounts[product.id] > 0) return false;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const matchesGender = filterGender === 'all' || product.gender === filterGender;
    const matchesBodyType = filterBodyType === 'all' ||
                           (Array.isArray(product.body_type) && product.body_type.includes(filterBodyType));
    const matchesVibe = filterVibe === 'all' || product.vibe.includes(filterVibe);
    const matchesSeason = filterSeason === 'all' ||
                         (Array.isArray(product.season) && product.season.includes(filterSeason));
    return matchesSearch && matchesCategory && matchesGender && matchesBodyType && matchesVibe && matchesSeason;
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">제품 관리</h1>
            <p className="text-gray-600">제품을 추가하고 관리하세요</p>
          </div>
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
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
              <option value="mid">미드레이어</option>
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
              value={filterBodyType}
              onChange={(e) => setFilterBodyType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">전체 체형</option>
              <option value="slim">Slim</option>
              <option value="regular">Regular</option>
              <option value="plus-size">Plus-size</option>
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
            <select
              value={filterSeason}
              onChange={(e) => setFilterSeason(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">전체 계절</option>
              <option value="spring">봄</option>
              <option value="summer">여름</option>
              <option value="fall">가을</option>
              <option value="winter">겨울</option>
            </select>
          </div>
        </div>

        <div className="mb-6">
          <VibeQualityDashboard
            products={products}
            usageCounts={productUsageCounts}
            onFilterUnused={() => setFilterUnused(prev => !prev)}
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              제품 목록 ({filteredProducts.length})
              {filterUnused && (
                <button
                  onClick={() => setFilterUnused(false)}
                  className="ml-2 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded transition-colors"
                >
                  미사용 필터 해제
                </button>
              )}
            </h2>
          </div>
          <ProductList
            products={filteredProducts}
            onProductsChange={loadProducts}
            onEditProduct={handleEditProduct}
            usageCounts={productUsageCounts}
          />
        </div>
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
    </div>
  );
}
