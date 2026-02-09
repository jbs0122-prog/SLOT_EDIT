import { useState } from 'react';
import { Product } from '../data/outfits';
import { supabase } from '../utils/supabase';
import { Edit2, Trash2, ExternalLink, Copy, Ban } from 'lucide-react';
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

  const handleDelete = async (product: Product) => {
    if (!confirm(`"${product.brand} ${product.name}"를 삭제하시겠습니까?`)) {
      return;
    }

    setDeletingId(product.id);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      alert('삭제되었습니다!');
      onProductsChange();
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제 실패: ' + (error as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = async (product: Product) => {
    if (!confirm(`"${product.brand} ${product.name}"를 복사하시겠습니까?`)) {
      return;
    }

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

      alert('제품이 복사되었습니다!');
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden"
        >
          <div className="relative">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-48 object-cover"
            />
            <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${getStockStatusColor(product.stock_status)}`}>
              {getStockStatusLabel(product.stock_status)}
            </div>
          </div>

          <div className="p-4">
            <div className="mb-2">
              <div className="text-xs text-gray-500 mb-1">
                {getItemLabel(product.category)} · {product.gender}
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">
                {product.brand || '브랜드 없음'}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2">
                {product.name}
              </p>
            </div>

            {product.color && (
              <div className="text-xs text-gray-500 mb-2">
                색상: {product.color}
              </div>
            )}

            {product.price && (
              <div className="text-lg font-bold text-gray-900 mb-2">
                ${product.price}
              </div>
            )}

            {product.vibe && product.vibe.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {product.vibe.map((v, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs"
                  >
                    {v}
                  </span>
                ))}
              </div>
            )}

            <div className="mb-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">코디 사용:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  (usageCounts[product.id] || 0) >= MAX_OUTFIT_USAGE
                    ? 'bg-red-100 text-red-700'
                    : (usageCounts[product.id] || 0) > 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                }`}>
                  {usageCounts[product.id] || 0}회
                </span>
                {(usageCounts[product.id] || 0) >= MAX_OUTFIT_USAGE && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                    <Ban size={10} />
                    자동생성 제외
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t">
              {product.product_link && (
                <a
                  href={product.product_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  <ExternalLink size={14} />
                  쇼핑
                </a>
              )}
              <button
                onClick={() => handleCopy(product)}
                disabled={copyingId === product.id}
                className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                title="제품 복사"
              >
                <Copy size={14} />
                {copyingId === product.id ? '...' : '복사'}
              </button>
              <button
                onClick={() => onEditProduct(product)}
                className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <Edit2 size={14} />
                수정
              </button>
              <button
                onClick={() => handleDelete(product)}
                disabled={deletingId === product.id}
                className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
                {deletingId === product.id ? '...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
