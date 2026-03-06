import { useState } from 'react';
import { Product } from '../data/outfits';
import { supabase } from '../utils/supabase';
import { CreditCard as Edit2, Trash2, ExternalLink, Copy, Ban, CheckSquare, Square, X } from 'lucide-react';
import { MAX_OUTFIT_USAGE } from '../utils/outfitGenerator';

interface ProductListProps {
  products: Product[];
  onProductsChange: () => void;
  onEditProduct: (product: Product) => void;
  usageCounts?: Record<string, number>;
}

export default function ProductList({ products, onProductsChange, onEditProduct, usageCounts = {} }: ProductListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const isSelectMode = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(products.map(p => p.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개 제품을 삭제하시겠습니까?`)) return;

    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', ids);

      if (error) throw error;

      clearSelection();
      onProductsChange();
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('삭제 실패: ' + (error as Error).message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`"${product.brand} ${product.name}"를 삭제하시겠습니까?`)) return;

    setDeletingId(product.id);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;
      onProductsChange();
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제 실패: ' + (error as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = async (product: Product) => {
    if (!confirm(`"${product.brand} ${product.name}"를 복사하시겠습니까?`)) return;

    setCopyingId(product.id);
    try {
      const { id, created_at, updated_at, ...productData } = product as any;

      const newProduct = {
        ...productData,
        name: `${product.name} (복사본)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('products')
        .insert([newProduct]);

      if (error) throw error;
      onProductsChange();
    } catch (error) {
      console.error('Copy error:', error);
      alert('복사 실패: ' + (error as Error).message);
    } finally {
      setCopyingId(null);
    }
  };

  const getItemLabel = (category: string) => {
    const labels: Record<string, string> = {
      outer: '아우터',
      mid: '미드레이어',
      top: '상의',
      bottom: '하의',
      shoes: '신발',
      bag: '가방',
      accessory: '액세서리'
    };
    return labels[category] || category;
  };

  const getStockStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      in_stock: '재고 있음',
      out_of_stock: '품절',
      coming_soon: '출시 예정'
    };
    return labels[status] || status;
  };

  const getStockStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      in_stock: 'bg-green-100 text-green-800',
      out_of_stock: 'bg-red-100 text-red-800',
      coming_soon: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        등록된 제품이 없습니다
      </div>
    );
  }

  return (
    <div>
      {/* Bulk Action Bar */}
      {isSelectMode ? (
        <div className="sticky top-0 z-10 mb-3 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 shadow-sm">
          <span className="text-sm font-semibold text-blue-700">{selectedIds.size}개 선택됨</span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={selectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <CheckSquare size={13} />
              전체 선택
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 size={13} />
              {bulkDeleting ? '삭제 중...' : `${selectedIds.size}개 삭제`}
            </button>
            <button
              onClick={clearSelection}
              className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={13} />
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-3 flex items-center justify-end">
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
          >
            <Square size={13} />
            다중 선택
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
        {products.map((product) => {
          const usage = usageCounts[product.id] || 0;
          const isMaxUsage = usage >= MAX_OUTFIT_USAGE;
          const isSelected = selectedIds.has(product.id);

          return (
            <div
              key={product.id}
              onClick={() => isSelectMode && toggleSelect(product.id)}
              className={`group relative bg-white rounded-lg border overflow-hidden transition-all duration-200 ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-400 shadow-md cursor-pointer'
                  : isSelectMode
                  ? 'border-gray-200 hover:border-blue-300 cursor-pointer hover:shadow-md'
                  : 'border-gray-200 hover:shadow-lg hover:border-gray-300'
              }`}
            >
              <div className="relative aspect-square bg-gray-50">
                <img
                  src={product.nobg_image_url || product.image_url}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-contain p-1"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/300x300?text=No+Image';
                  }}
                />

                {/* Select Checkbox */}
                {isSelectMode && (
                  <div className="absolute top-1.5 left-1.5 z-10">
                    <div className={`w-5 h-5 rounded flex items-center justify-center shadow ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-white border-2 border-gray-300'
                    }`}>
                      {isSelected && <CheckSquare size={12} className="text-white" />}
                    </div>
                  </div>
                )}

                <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${getStockStatusColor(product.stock_status)}`}>
                  {getStockStatusLabel(product.stock_status)}
                </div>

                {isMaxUsage && (
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-medium">
                    <Ban size={9} />
                    제외
                  </div>
                )}

                {usage > 0 && !isMaxUsage && !isSelectMode && (
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-semibold">
                    {usage}회
                  </div>
                )}

                {!isSelectMode && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-1.5">
                      {(product.affiliate_link || product.product_link) && (
                        <a
                          href={product.affiliate_link || product.product_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
                          title="쇼핑"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopy(product); }}
                        disabled={copyingId === product.id}
                        className="p-2 bg-white rounded-full text-green-700 hover:bg-green-50 transition-colors shadow-sm disabled:opacity-50"
                        title="복사"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditProduct(product); }}
                        className="p-2 bg-white rounded-full text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
                        title="수정"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(product); }}
                        disabled={deletingId === product.id}
                        className="p-2 bg-white rounded-full text-red-700 hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(product.id); }}
                        className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
                        title="선택"
                      >
                        <CheckSquare size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-2.5 py-2">
                <p className="text-xs text-gray-900 font-medium leading-tight line-clamp-2 min-h-[2rem]">
                  {product.name}
                </p>
                <div className="mt-1 flex items-baseline justify-between gap-1">
                  {product.price ? (
                    <span className="text-sm font-bold text-gray-900">${product.price}</span>
                  ) : (
                    <span className="text-xs text-gray-400">--</span>
                  )}
                  <span className="text-[10px] text-gray-400 truncate">
                    {getItemLabel(product.category)} · {product.gender}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
