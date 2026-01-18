import { useState, useEffect, useRef } from 'react';
import { fetchNYCWeather, WeatherData, getWeatherEmoji } from '../utils/weather';
import { supabase } from '../utils/supabase';
import { HelpCircle, X } from 'lucide-react';
import HeroBanner from './HeroBanner';

interface InputProps {
  onGenerate: (where: string, style: string, subToggle: string | null, weather: WeatherData) => void;
}

const WHERE_OPTIONS = ['Office', 'Gym', 'City Walk', 'Night Out', 'Wedding', 'Date', 'Interview'];
const STYLE_OPTIONS = ['Minimal', 'Casual', 'Street', 'Dandy', 'Sporty'];

export default function Input({ onGenerate }: InputProps) {
  const [where, setWhere] = useState<string>(WHERE_OPTIONS[0]);
  const [style, setStyle] = useState<string>(STYLE_OPTIONS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackOccasion, setFeedbackOccasion] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const whereRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadWeather();
  }, []);

  const loadWeather = async () => {
    setWeatherError(false);
    try {
      const data = await fetchNYCWeather(0);
      setWeather(data);
    } catch (error) {
      setWeatherError(true);
      console.error('Weather fetch failed:', error);
    }
  };

  useEffect(() => {
    const setupScrollPicker = (
      containerRef: React.RefObject<HTMLDivElement>,
      options: string[],
      setState: (value: string) => void
    ) => {
      const container = containerRef.current;
      if (!container) return;

      const items = container.querySelectorAll('[data-scroll-item]');
      if (items.length === 0) return;

      // Calculate which item is centered
      const getCenteredItem = () => {
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;

        let closestItem: Element | null = null;
        let closestDistance = Infinity;

        items.forEach((item) => {
          const itemRect = item.getBoundingClientRect();
          const itemCenter = itemRect.top + itemRect.height / 2;
          const distance = Math.abs(containerCenter - itemCenter);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestItem = item;
          }
        });

        return closestItem;
      };

      // Update state based on centered item
      const updateSelection = () => {
        const centeredItem = getCenteredItem();
        if (centeredItem) {
          const value = centeredItem.getAttribute('data-value');
          if (value) {
            setState(value);
          }
        }
      };

      // Set initial scroll position to center the first item
      const firstItem = items[0] as HTMLElement;
      const containerHeight = container.clientHeight;
      const itemHeight = firstItem.clientHeight;
      const targetScrollTop = firstItem.offsetTop - (containerHeight / 2) + (itemHeight / 2);
      container.scrollTop = targetScrollTop;

      // Initial update
      updateSelection();

      // Add scroll event listener with debouncing
      let scrollTimeout: number;
      const handleScroll = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = window.setTimeout(() => {
          updateSelection();
        }, 50);
      };

      container.addEventListener('scroll', handleScroll);

      return () => {
        container.removeEventListener('scroll', handleScroll);
        clearTimeout(scrollTimeout);
      };
    };

    const cleanup1 = setupScrollPicker(whereRef, WHERE_OPTIONS, setWhere);
    const cleanup2 = setupScrollPicker(styleRef, STYLE_OPTIONS, setStyle);

    return () => {
      cleanup1?.();
      cleanup2?.();
    };
  }, []);

  const handleGenerate = () => {
    if (!weather) return;

    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      onGenerate(where, style, null, weather);
    }, 800);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackOccasion.trim()) return;

    try {
      const { error } = await supabase
        .from('occasion_feedback')
        .insert({
          occasion: feedbackOccasion.trim(),
          email: feedbackEmail.trim() || null,
        });

      if (error) throw error;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-feedback-notification`;
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          occasion: feedbackOccasion.trim(),
          email: feedbackEmail.trim() || null,
        }),
      }).catch(err => console.error('Email notification failed:', err));

      setFeedbackSubmitted(true);
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackOccasion('');
        setFeedbackEmail('');
        setFeedbackSubmitted(false);
      }, 2000);
    } catch (e) {
      console.error('Failed to save feedback:', e);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  const isComplete = weather !== null;

  const heroBannerImages = [
    '/hero-banner-1.png',
    '/hero-banner-2.png',
    '/hero-banner-3.png',
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="pt-8 pb-6 px-6">
        <div className="flex justify-center">
          <img src="/logo.png" alt="SLOT EDIT" className="h-24" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full px-6 mb-8">
        <HeroBanner images={heroBannerImages} />
      </div>

      <main className="flex-1 flex flex-col justify-center px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-center mb-8">
            DON'T SEARCH—SELECT.
          </h2>
        </div>

        <div className="max-w-4xl mx-auto w-full">
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <h3 className="text-xs font-light tracking-widest text-gray-400 uppercase mb-3">
                Weather
              </h3>
            </div>
            <div className="text-center">
              <h3 className="text-xs font-light tracking-widest text-gray-400 uppercase mb-3">
                Where
              </h3>
            </div>
            <div className="text-center">
              <h3 className="text-xs font-light tracking-widest text-gray-400 uppercase mb-3">
                Style
              </h3>
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-3 gap-6">
              <div className="relative">
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
                </div>
                <div className="h-[200px] flex flex-col items-center justify-center">
                {weather ? (
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-1">
                      {weather.location}
                    </div>
                    <div className="text-2xl font-semibold text-black mb-1">
                      {weather.temperature}°C
                    </div>
                    <div className="text-base text-gray-700">
                      {getWeatherEmoji(weather.condition)} {weather.condition}
                    </div>
                  </div>
                ) : weatherError ? (
                  <div className="text-center">
                    <div className="text-lg text-gray-400 mb-1">--°C</div>
                    <div className="text-xs text-gray-400">Weather unavailable</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-sm text-gray-400">Loading...</div>
                  </div>
                )}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent" />
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 border-y border-gray-200" />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
                </div>
                <div
                  ref={whereRef}
                  className="h-[200px] overflow-y-scroll scroll-smooth snap-y snap-mandatory scrollbar-hide"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                <div className="h-[76px]" />
                {WHERE_OPTIONS.map((option) => (
                  <div
                    key={option}
                    data-scroll-item
                    data-value={option}
                    className="h-12 snap-center flex items-center justify-center transition-all duration-200"
                  >
                    <span
                      className={`tracking-wider uppercase transition-all duration-200 ${
                        where === option
                          ? 'text-lg font-bold text-black'
                          : 'text-base font-normal text-gray-600'
                      }`}
                    >
                      {option}
                    </span>
                  </div>
                ))}
                <div className="h-[76px]" />
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent" />
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 border-y border-gray-200" />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
                </div>
                <div
                  ref={styleRef}
                  className="h-[200px] overflow-y-scroll scroll-smooth snap-y snap-mandatory scrollbar-hide"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                <div className="h-[76px]" />
                {STYLE_OPTIONS.map((option) => (
                  <div
                    key={option}
                    data-scroll-item
                    data-value={option}
                    className="h-12 snap-center flex items-center justify-center transition-all duration-200"
                  >
                    <span
                      className={`tracking-wider uppercase transition-all duration-200 ${
                        style === option
                          ? 'text-lg font-bold text-black'
                          : 'text-base font-normal text-gray-600'
                      }`}
                    >
                      {option}
                    </span>
                  </div>
                ))}
                <div className="h-[76px]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto w-full mt-10">
          <button
            onClick={handleGenerate}
            disabled={!isComplete || isGenerating}
            className={`w-full py-5 px-8 text-base tracking-widest font-normal uppercase transition-all ${
              isComplete && !isGenerating
                ? 'bg-black text-white hover:bg-gray-900 cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isGenerating ? 'Finding your look...' : 'shop this moment'}
          </button>

          <div className="mt-6 text-center">
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="text-sm text-gray-500 hover:text-black transition-colors inline-flex items-center gap-1"
            >
              <HelpCircle className="w-4 h-4" />
              Can't find your occasion?
            </button>
          </div>
        </div>

        <div className="mt-8 mb-8">
          <h2 className="text-2xl font-bold text-center mb-2">
            SLOTS OVER SEARCH
          </h2>
          <p className="text-sm text-gray-600 font-light text-center mb-8">
            NYC trends, edited weekly.<br />
            Pick a slot—get 3 editor picks.
          </p>
          <div className="max-w-4xl mx-auto w-full mb-6">
            <img
              src="/sub-banner.png"
              alt="Sub Banner"
              className="w-full h-auto"
            />
          </div>
        </div>
      </main>

      <footer className="pb-8 text-center">
        <p className="text-xs text-gray-400 font-light">
          AI-Powered Fashion Curation for NYC Men
        </p>
      </footer>

      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowFeedbackModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>

            {feedbackSubmitted ? (
              <div className="text-center py-8">
                <div className="text-2xl mb-2">✓</div>
                <h3 className="text-xl font-light mb-2">Thanks!</h3>
                <p className="text-sm text-gray-600">We'll consider adding it.</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-light mb-4">Suggest an Occasion</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Tell us what occasion you're looking for and we'll consider adding it.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">
                      Occasion *
                    </label>
                    <input
                      type="text"
                      value={feedbackOccasion}
                      onChange={(e) => setFeedbackOccasion(e.target.value)}
                      placeholder="e.g., club rooftop party"
                      className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={feedbackEmail}
                      onChange={(e) => setFeedbackEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 border border-gray-300 focus:border-black focus:outline-none text-sm"
                    />
                  </div>

                  <button
                    onClick={handleFeedbackSubmit}
                    disabled={!feedbackOccasion.trim()}
                    className={`w-full py-3 text-sm tracking-wider uppercase ${
                      feedbackOccasion.trim()
                        ? 'bg-black text-white hover:bg-gray-900'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Submit
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
