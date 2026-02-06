import { useState, useRef, useEffect, TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Plus } from 'lucide-react';
import { Outfit, ImagePin, Product } from '../data/outfits';
import ProductDetailModal from './ProductDetailModal';

interface ImageSliderProps {
  images: { url: string; label: string; tpo?: string }[];
  alt: string;
  outfitNumber: number;
  outfitId: string;
  onFeedback?: (outfitId: string, feedbackType: 'like' | 'dislike') => void;
  likeCount?: number;
  dislikeCount?: number;
  userFeedback?: 'like' | 'dislike' | null;
  outfit?: Outfit;
  showOutfitInfo?: boolean;
  products?: Product[];
}

export default function ImageSlider({
  images,
  alt,
  outfitNumber,
  outfitId,
  onFeedback,
  likeCount = 0,
  dislikeCount = 0,
  userFeedback = null,
  outfit,
  showOutfitInfo = false,
  products = []
}: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const minSwipeDistance = 50;

  const getPinsForImage = (imageLabel: string): ImagePin[] => {
    if (!outfit) return [];

    if (imageLabel === 'Flatlay') return outfit.flatlay_pins || [];
    if (imageLabel === 'On Model') return outfit.on_model_pins || [];

    return [];
  };

  const handlePinClick = (pin: ImagePin) => {
    if (pin.product_id) {
      const product = products.find(p => p.id === pin.product_id);
      if (product) {
        const link = product.affiliate_link || product.product_link;
        if (link) {
          window.open(link, '_blank', 'noopener,noreferrer');
        } else {
          setSelectedProduct(product);
        }
        return;
      }
    }

    if (pin.url) {
      window.open(pin.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.stopPropagation();
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.stopPropagation();
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.stopPropagation();
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(images.length - 1, prev + 1));
  };

  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    const pins = getPinsForImage(images[0].label);

    return (
      <div
        className="relative bg-gray-100 h-full"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="text-center max-w-full">
            <p className="text-xs text-gray-500 mb-2">{images[0].label}</p>
            <p className="text-xs text-gray-400 break-all font-mono">{images[0].url || 'No URL'}</p>
          </div>
        </div>
        <img
          src={images[0].url}
          alt={alt}
          className="w-full h-full object-cover relative z-10"
          onLoad={(e) => {
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const infoDiv = parent.querySelector('div:nth-child(2)');
              if (infoDiv) infoDiv.style.display = 'none';
            }
          }}
          onError={(e) => {
            console.error('Image failed to load:', images[0].url);
            e.currentTarget.style.display = 'none';
          }}
        />

        {images[0].tpo && (
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-gray-500/60 text-white px-3 py-1 rounded-full text-xs font-light">
              #{images[0].tpo}
            </div>
          </div>
        )}

        {showOutfitInfo && outfit && (
          <div className="absolute bottom-20 left-0 right-0 flex justify-center z-10 px-4">
            <div className="bg-black/70 text-white px-4 py-2 text-xs uppercase tracking-wider">
              {outfit.gender} · {outfit.body_type} · {outfit.vibe}
            </div>
          </div>
        )}

        {pins.map((pin, index) => {
          const product = pin.product_id ? products.find(p => p.id === pin.product_id) : null;
          const pinId = `single-${pin.x}-${pin.y}-${index}`;
          const isHovered = !isMobile && hoveredPin === pinId;

          return (
            <div
              key={index}
              className="absolute z-20"
              style={{
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePinClick(pin);
                }}
                onMouseEnter={() => { if (!isMobile) setHoveredPin(pinId); }}
                onMouseLeave={() => { if (!isMobile) setHoveredPin(null); }}
                className="w-5 h-5 rounded-full bg-white/90 shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center hover:scale-110"
                aria-label={`Shop ${pin.item}`}
              >
                <Plus size={12} className="text-gray-700" strokeWidth={2.5} />
              </button>

              {isHovered && product && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-3 w-48 border border-gray-200 pointer-events-none">
                  <p className="font-semibold text-gray-900 text-sm mb-1">{product.brand}</p>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{product.name}</p>
                  {product.price && (
                    <p className="text-sm font-bold text-blue-600">${product.price}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Click to shop</p>
                </div>
              )}
            </div>
          );
        })}

        {onFeedback && (
          <div className="absolute bottom-6 right-6 flex gap-2 z-10">
            <button
              onClick={() => onFeedback(outfitId, 'like')}
              className={`p-2 transition-all ${
                userFeedback === 'like'
                  ? 'bg-black text-white'
                  : 'bg-white/90 hover:bg-white text-gray-800'
              }`}
              aria-label="Like this outfit"
            >
              <ThumbsUp className="w-5 h-5" />
              {likeCount > 0 && (
                <span className="ml-1 text-xs font-light">{likeCount}</span>
              )}
            </button>
            <button
              onClick={() => onFeedback(outfitId, 'dislike')}
              className={`p-2 transition-all ${
                userFeedback === 'dislike'
                  ? 'bg-black text-white'
                  : 'bg-white/90 hover:bg-white text-gray-800'
              }`}
              aria-label="Dislike this outfit"
            >
              <ThumbsDown className="w-5 h-5" />
              {dislikeCount > 0 && (
                <span className="ml-1 text-xs font-light">{dislikeCount}</span>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex transition-transform duration-300 ease-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((image, index) => {
          const pins = getPinsForImage(image.label);

          return (
            <div key={index} className="w-full h-full flex-shrink-0 relative bg-gray-100">
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="text-center max-w-full">
                  <p className="text-xs text-gray-500 mb-2">{image.label}</p>
                  <p className="text-xs text-gray-400 break-all font-mono">{image.url || 'No URL'}</p>
                </div>
              </div>
              <img
                src={image.url}
                alt={`${alt} - ${image.label}`}
                className="w-full h-full object-cover relative z-10"
                onLoad={(e) => {
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const infoDiv = parent.querySelector('div');
                    if (infoDiv) infoDiv.style.display = 'none';
                  }
                }}
                onError={(e) => {
                  console.error('Image failed to load:', image.url);
                  e.currentTarget.style.display = 'none';
                }}
              />

              {image.tpo && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-gray-500/60 text-white px-3 py-1 rounded-full text-xs font-light">
                    #{image.tpo}
                  </div>
                </div>
              )}

              {showOutfitInfo && outfit && (
                <div className="absolute bottom-20 left-0 right-0 flex justify-center z-10 px-4">
                  <div className="bg-black/70 text-white px-4 py-2 text-xs uppercase tracking-wider">
                    {outfit.gender} · {outfit.body_type} · {outfit.vibe}
                  </div>
                </div>
              )}

              {pins.map((pin, pinIndex) => {
                const product = pin.product_id ? products.find(p => p.id === pin.product_id) : null;
                const pinId = `slider-${index}-${pin.x}-${pin.y}-${pinIndex}`;
                const isHovered = !isMobile && hoveredPin === pinId;

                return (
                  <div
                    key={pinIndex}
                    className="absolute z-20"
                    style={{
                      left: `${pin.x}%`,
                      top: `${pin.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePinClick(pin);
                      }}
                      onMouseEnter={() => { if (!isMobile) setHoveredPin(pinId); }}
                      onMouseLeave={() => { if (!isMobile) setHoveredPin(null); }}
                      className="w-5 h-5 rounded-full bg-white/90 shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center hover:scale-110"
                      aria-label={`Shop ${pin.item}`}
                    >
                      <Plus size={12} className="text-gray-700" strokeWidth={2.5} />
                    </button>

                    {isHovered && product && (
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-3 w-48 border border-gray-200 pointer-events-none">
                        <p className="font-semibold text-gray-900 text-sm mb-1">{product.brand}</p>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{product.name}</p>
                        {product.price && (
                          <p className="text-sm font-bold text-blue-600">${product.price}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">Click to shop</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {currentIndex > 0 && (
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 transition-colors z-10"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {currentIndex < images.length - 1 && (
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 transition-colors z-10"
          aria-label="Next image"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`transition-all ${
              index === currentIndex
                ? 'bg-white w-8 h-2'
                : 'bg-white/50 w-2 h-2 hover:bg-white/75'
            }`}
            aria-label={`Go to ${image.label}`}
          />
        ))}
      </div>

      {onFeedback && (
        <div className="absolute bottom-6 right-6 flex gap-2 z-10">
          <button
            onClick={() => onFeedback(outfitId, 'like')}
            className={`p-2 transition-all ${
              userFeedback === 'like'
                ? 'bg-black text-white'
                : 'bg-white/90 hover:bg-white text-gray-800'
            }`}
            aria-label="Like this outfit"
          >
            <ThumbsUp className="w-5 h-5" />
            {likeCount > 0 && (
              <span className="ml-1 text-xs font-light">{likeCount}</span>
            )}
          </button>
          <button
            onClick={() => onFeedback(outfitId, 'dislike')}
            className={`p-2 transition-all ${
              userFeedback === 'dislike'
                ? 'bg-black text-white'
                : 'bg-white/90 hover:bg-white text-gray-800'
            }`}
            aria-label="Dislike this outfit"
          >
            <ThumbsDown className="w-5 h-5" />
            {dislikeCount > 0 && (
              <span className="ml-1 text-xs font-light">{dislikeCount}</span>
            )}
          </button>
        </div>
      )}

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          affiliateLink={selectedProduct.affiliate_link}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
