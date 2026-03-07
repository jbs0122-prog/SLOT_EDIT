import { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../data/outfits';
import { supabase } from '../utils/supabase';
import ProductForm from './ProductForm';
import ProductList from './ProductList';
import CSVUpload from './CSVUpload';
import VibeQualityDashboard from './VibeQualityDashboard';
import { Plus, Upload, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 40;

interface Filters {
  searchTerm: string;
  filterCategory: string;
  filterGender: string;
  filterBodyType: string;
  filterVibe: string;
  filterSeason: string;
}

const FILTER_KEY = 'admin_products_filters';

function loadSavedFilters(): Partial<Filters> | null {
  try {
    const raw = sessionStorage.getItem(FILTER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveFiltersToStorage(filters: Partial<Filters>) {
  try {
    const current = loadSavedFilters() || {};
    sessionStorage.setItem(FILTER_KEY, JSON.stringify({ ...current, ...filters }));
  } catch { /* ignore */ }
}

function mapRowToProduct(p: any): Product {
  return {
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
    nobg_image_url: p.nobg_image_url || undefined,
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
  } as Product;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showProductForm, setShowProductForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const saved = loadSavedFilters();
  const [searchTerm, setSearchTermRaw] = useState(saved?.searchTerm ?? '');
  const [filterCategory, setFilterCategoryRaw] = useState(saved?.filterCategory ?? 'all');
  const [filterGender, setFilterGenderRaw] = useState(saved?.filterGender ?? 'all');
  const [filterBodyType, setFilterBodyTypeRaw] = useState(saved?.filterBodyType ?? 'all');
  const [filterVibe, setFilterVibeRaw] = useState(saved?.filterVibe ?? 'all');
  const [filterSeason, setFilterSeasonRaw] = useState(saved?.filterSeason ?? 'all');

  const [productUsageCounts, setProductUsageCounts] = useState<Record<string, number>>({});

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSearchTerm = (v: string) => {
    setSearchTermRaw(v);
    saveFiltersToStorage({ searchTerm: v });
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setCurrentPage(0);
    }, 400);
  };

  const setFilterCategory = (v: string) => { setFilterCategoryRaw(v); saveFiltersToStorage({ filterCategory: v }); setCurrentPage(0); };
  const setFilterGender = (v: string) => { setFilterGenderRaw(v); saveFiltersToStorage({ filterGender: v }); setCurrentPage(0); };
  const setFilterBodyType = (v: string) => { setFilterBodyTypeRaw(v); saveFiltersToStorage({ filterBodyType: v }); setCurrentPage(0); };
  const setFilterVibe = (v: string) => { setFilterVibeRaw(v); saveFiltersToStorage({ filterVibe: v }); setCurrentPage(0); };
  const setFilterSeason = (v: string) => { setFilterSeasonRaw(v); saveFiltersToStorage({ filterSeason: v }); setCurrentPage(0); };

  const loadProductUsageCounts = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_product_usage_counts');
      if (error) throw error;

      const counts: Record<string, number> = {};
      (data as { product_id: string; usage_count: number }[])?.forEach(row => {
        counts[row.product_id] = row.usage_count;
      });
      setProductUsageCounts(counts);
    } catch (error) {
      console.error('Failed to load product usage counts:', error);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' });

      if (searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm.trim()}%,brand.ilike.%${searchTerm.trim()}%`);
      }
      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }
      if (filterGender !== 'all') {
        query = query.eq('gender', filterGender);
      }
      if (filterBodyType !== 'all') {
        query = query.contains('body_type', [filterBodyType]);
      }
      if (filterVibe !== 'all') {
        query = query.contains('vibe', [filterVibe]);
      }
      if (filterSeason !== 'all') {
        query = query.contains('season', [filterSeason]);
      }

      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setProducts(data?.map(mapRowToProduct) || []);
      setTotalCount(count ?? 0);
    } catch (error) {
      console.error('Failed to load products:', error);
      alert('제품 로드 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterCategory, filterGender, filterBodyType, filterVibe, filterSeason, currentPage]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadProductUsageCounts();
  }, [loadProductUsageCounts]);

  useEffect(() => {
    const channel = supabase
      .channel('products-nobg-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, (payload) => {
        const updated = payload.new as { id: string; nobg_image_url?: string };
        if (updated?.id && updated?.nobg_image_url) {
          setProducts(prev => prev.map(p =>
            p.id === updated.id ? { ...p, nobg_image_url: updated.nobg_image_url } : p
          ));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
    loadProductUsageCounts();
    handleProductFormClose();
  };

  const handleCSVUploadComplete = () => {
    loadProducts();
    loadProductUsageCounts();
    setShowCSVUpload(false);
  };

  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (currentPage > 3) pages.push('ellipsis');

      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages - 2, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 4) pages.push('ellipsis');
      pages.push(totalPages - 1);
    }
    return pages;
  };

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
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              제품 목록 ({totalCount}개)
            </h2>
            {totalPages > 1 && (
              <span className="text-sm text-gray-500">
                {currentPage + 1} / {totalPages} 페이지
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-500">로딩 중...</div>
            </div>
          ) : (
            <ProductList
              products={products}
              onProductsChange={loadProducts}
              onEditProduct={handleEditProduct}
              usageCounts={productUsageCounts}
            />
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-1">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {getPageNumbers().map((page, i) =>
                page === 'ellipsis' ? (
                  <span key={`e-${i}`} className="px-2 text-gray-400 text-sm">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                      page === currentPage
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {page + 1}
                  </button>
                )
              )}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
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
