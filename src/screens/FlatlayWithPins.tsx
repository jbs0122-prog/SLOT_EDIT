import { useState, useEffect } from 'react';
import { ShoppingBag } from 'lucide-react';
import { ImagePin } from '../data/outfits';
import { supabase } from '../utils/supabase';

interface FlatlayWithPinsProps {
  imageUrl: string;
  pins: ImagePin[];
  outfitId: string;
  className?: string;
}

interface ProductInfo {
  id: string;
  name: string;
  brand: string;
  price: number | null;
  affiliate_link?: string;
  product_link?: string;
}

export default function FlatlayWithPins({ imageUrl, pins, outfitId, className = '' }: FlatlayWithPinsProps) {
  const [products, setProducts] = useState<{ [productId: string]: ProductInfo }>({});
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [outfitId, pins]);

  const loadProducts = async () => {
    if (!pins || pins.length === 0) return;

    const productIds = pins
      .map(pin => pin.product_id)
      .filter((id): id is string => !!id);

    if (productIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, brand, price, affiliate_link, product_link')
        .in('id', productIds);

      if (error) throw error;

      const productsMap: { [productId: string]: ProductInfo } = {};
      data?.forEach(product => {
        productsMap[product.id] = product;
      });

      setProducts(productsMap);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handlePinClick = (pin: ImagePin) => {
    if (!pin.product_id) return;

    const product = products[pin.product_id];
    if (!product) return;

    const link = product.affiliate_link || product.product_link;
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <img
        src={imageUrl}
        alt="Flatlay"
        className="w-full h-auto rounded-lg"
      />

      {pins.map((pin, index) => {
        const product = pin.product_id ? products[pin.product_id] : null;
        const pinId = `${pin.x}-${pin.y}-${index}`;
        const isHovered = hoveredPin === pinId;

        return (
          <div
            key={pinId}
            className="absolute group"
            style={{
              left: `${pin.x}%`,
              top: `${pin.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <button
              onClick={() => handlePinClick(pin)}
              onMouseEnter={() => setHoveredPin(pinId)}
              onMouseLeave={() => setHoveredPin(null)}
              className="relative w-10 h-10 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center border-2 border-gray-200 hover:border-blue-500 hover:scale-110 cursor-pointer"
            >
              <ShoppingBag size={18} className="text-gray-700 group-hover:text-blue-600" />
            </button>

            {isHovered && product && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-3 w-48 z-10 border border-gray-200">
                <p className="font-semibold text-gray-900 text-sm mb-1">{product.brand}</p>
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{product.name}</p>
                {product.price && (
                  <p className="text-sm font-bold text-blue-600">${product.price}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">클릭하여 구매하기</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
