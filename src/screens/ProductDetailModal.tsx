import { X, ExternalLink } from 'lucide-react';
import { Product } from '../data/outfits';

interface ProductDetailModalProps {
  product: Product;
  affiliateLink?: string;
  onClose: () => void;
}

export default function ProductDetailModal({ product, affiliateLink, onClose }: ProductDetailModalProps) {
  const handleBuyClick = () => {
    const linkToUse = affiliateLink || product.product_link;
    if (linkToUse) {
      window.open(linkToUse, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Product Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-64 object-cover rounded-lg"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
              }}
            />
          </div>

          <div className="space-y-3">
            {product.brand && (
              <div className="text-sm text-gray-500 uppercase tracking-wide">
                {product.brand}
              </div>
            )}

            <h4 className="text-xl font-bold text-gray-900">{product.name}</h4>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="px-2 py-1 bg-gray-100 rounded uppercase text-xs">
                {product.category}
              </span>
              {product.color && (
                <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                  {product.color}
                </span>
              )}
            </div>

            {product.price && (
              <div className="text-2xl font-bold text-gray-900">
                ${product.price}
              </div>
            )}

            {product.stock_status && (
              <div className="text-sm">
                <span className={`px-2 py-1 rounded text-xs uppercase font-medium ${
                  product.stock_status === 'in_stock'
                    ? 'bg-green-100 text-green-800'
                    : product.stock_status === 'out_of_stock'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {product.stock_status === 'in_stock' ? 'In Stock' :
                   product.stock_status === 'out_of_stock' ? 'Out of Stock' :
                   'Coming Soon'}
                </span>
              </div>
            )}

            {(affiliateLink || product.product_link) && (
              <button
                onClick={handleBuyClick}
                className="w-full flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                <ExternalLink size={18} />
                Shop Now
              </button>
            )}

            {affiliateLink && (
              <p className="text-xs text-gray-400 text-center">
                Affiliate link - We may earn a commission
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
