import { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../data/outfits';
import { supabase } from '../utils/supabase';
import ProductForm from './ProductForm';
import ProductList from './ProductList';
import CSVUpload from './CSVUpload';
import VibeQualityDashboard from './VibeQualityDashboard';
import { Plus, Upload, Loader2 } from 'lucide-react';

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

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
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const filterVersionRef = useRef(0);

  const resetAndReload = useCallback(() => {
    filterVersionRef.current += 1;
    setProducts([]);
    setTotalCount(0);
    setHasMore(true);
    setInitialLoading(true);
  }, []);

  const setSearchTerm = (v: string) => {
    setSearchTermRaw(v);
    saveFiltersToStorage({ searchTerm: v });
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      resetAndReload();
    }, 400);
  };

  const setFilterCategory = (v: string) => { setFilterCategoryRaw(v); saveFiltersToStorage({ filterCategory: v }); resetAndReload(); };
  const setFilterGender = (v: string) => { setFilterGenderRaw(v); saveFiltersToStorage({ filterGender: v }); resetAndReload(); };
  const setFilterBodyType = (v: string) => { setFilterBodyTypeRaw(v); saveFiltersToStorage({ filterBodyType: v }); resetAndReload(); };
  const setFilterVibe = (v: string) => { setFilterVibeRaw(v); saveFiltersToStorage({ filterVibe: v }); resetAndReload(); };
  const setFilterSeason = (v: string) => { setFilterSeasonRaw(v); saveFiltersToStorage({ filterSeason: v }); resetAndReload(); };

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

  const buildQuery = useCallback(() => {
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

    return query;
  }, [searchTerm, filterCategory, filterGender, filterBodyType, filterVibe, filterSeason]);

  const loadInitial = useCallback(async () => {
    const version = filterVersionRef.current;
    setInitialLoading(true);
    try {
      const { data, error, count } = await buildQuery()
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (version !== filterVersionRef.current) return;
      if (error) throw error;

      const mapped = data?.map(mapRowToProduct) || [];
      setProducts(mapped);
      setTotalCount(count ?? 0);
      setHasMore(mapped.length >= PAGE_SIZE);
    } catch (error) {
      if (version !== filterVersionRef.current) return;
      console.error('Failed to load products:', error);
      alert('제품 로드 실패: ' + (error as Error).message);
    } finally {
      if (version === filterVersionRef.current) {
        setInitialLoading(false);
      }
    }
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    const version = filterVersionRef.current;
    setLoadingMore(true);
    try {
      const from = products.length;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await buildQuery()
        .order('created_at', { ascending: false })
        .range(from, to);

      if (version !== filterVersionRef.current) return;
      if (error) throw error;

      const mapped = data?.map(mapRowToProduct) || [];
      setProducts(prev => [...prev, ...mapped]);
      if (count !== null) setTotalCount(count);
      setHasMore(mapped.length >= PAGE_SIZE);
    } catch (error) {
      if (version !== filterVersionRef.current) return;
      console.error('Failed to load more products:', error);
    } finally {
      if (version === filterVersionRef.current) {
        setLoadingMore(false);
      }
    }
  }, [buildQuery, products.length, loadingMore, hasMore]);

  useEffect(() => {
    if (initialLoading) {
      loadInitial();
    }
  }, [initialLoading, loadInitial]);

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

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !initialLoading && !loadingMore && hasMore) {
          loadMore();
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, initialLoading, loadingMore, hasMore]);

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

  const handleProductSaved = useCallback((savedProduct: Product | null) => {
    if (savedProduct) {
      if (editingProduct) {
        setProducts(prev => prev.map(p => p.id === savedProduct.id ? savedProduct : p));
      } else {
        setProducts(prev => [savedProduct, ...prev]);
        setTotalCount(prev => prev + 1);
      }
    } else {
      resetAndReload();
    }
    loadProductUsageCounts();
    handleProductFormClose();
  }, [editingProduct, resetAndReload, loadProductUsageCounts]);

  const handleProductDeleted = useCallback((ids: string[]) => {
    setProducts(prev => prev.filter(p => !ids.includes(p.id)));
    setTotalCount(prev => prev - ids.length);
    loadProductUsageCounts();
  }, [loadProductUsageCounts]);

  const handleProductCopied = useCallback((newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev]);
    setTotalCount(prev => prev + 1);
    loadProductUsageCounts();
  }, [loadProductUsageCounts]);

  const handleCSVUploadComplete = () => {
    resetAndReload();
    loadProductUsageCounts();
    setShowCSVUpload(false);
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
            {products.length > 0 && products.length < totalCount && (
              <span className="text-sm text-gray-500">
                {products.length} / {totalCount}개 로드됨
              </span>
            )}
          </div>

          {initialLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-500">로딩 중...</div>
            </div>
          ) : (
            <>
              <ProductList
                products={products}
                onProductDeleted={handleProductDeleted}
                onProductCopied={handleProductCopied}
                onEditProduct={handleEditProduct}
                usageCounts={productUsageCounts}
              />

              <div ref={sentinelRef} className="h-1" />

              {loadingMore && (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 size={18} className="animate-spin text-blue-500" />
                  <span className="text-sm text-gray-500">더 불러오는 중...</span>
                </div>
              )}

              {!hasMore && products.length > 0 && products.length >= PAGE_SIZE && (
                <div className="text-center py-4 text-sm text-gray-400">
                  모든 제품을 불러왔습니다
                </div>
              )}
            </>
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
