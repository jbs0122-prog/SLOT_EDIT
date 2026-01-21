import { useState, useRef, TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown } from 'lucide-react';

interface ImageSliderProps {
  images: { url: string; label: string }[];
  alt: string;
  outfitNumber: number;
  outfitId: string;
  onFeedback?: (outfitId: string, feedbackType: 'like' | 'dislike') => void;
  likeCount?: number;
  dislikeCount?: number;
  userFeedback?: 'like' | 'dislike' | null;
}

export default function ImageSlider({
  images,
  alt,
  outfitNumber,
  outfitId,
  onFeedback,
  likeCount = 0,
  dislikeCount = 0,
  userFeedback = null
}: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
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
    return (
      <div className="relative bg-gray-100 h-full">
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
        {images.map((image, index) => (
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
          </div>
        ))}
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

      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-black/75 text-white px-3 py-1 text-xs font-light z-10">
        {images[currentIndex].label}
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
    </div>
  );
}
