import { useState, useEffect, useRef, TouchEvent } from 'react';
import { Outfit } from '../data/outfits';
import { WeatherData, getWeatherEmoji } from '../utils/weather';
import ImageSlider from './ImageSlider';
import { supabase } from '../utils/supabase';

interface ResultsProps {
  outfits: Outfit[];
  context: {
    gender: string;
    bodyType: string;
    vibe: string;
    weather: WeatherData | null;
  };
  onBack: () => void;
  onGenerate: (gender: string, bodyType: string, vibe: string, weather: WeatherData) => void;
}

const GENDER_OPTIONS = ['MALE', 'FEMALE'];
const BODY_TYPE_OPTIONS = ['SLIM', 'REGULAR', 'PLUS-SIZE'];
const VIBE_OPTIONS = ['ELEVATED COOL', 'EFFORTLESS NATURAL', 'ARTISTIC MINIMAL', 'RETRO LUXE', 'SPORT-MODERN', 'CREATIVE LAYERED'];

interface FeedbackCounts {
  [outfitId: string]: {
    likes: number;
    dislikes: number;
    userFeedback: 'like' | 'dislike' | null;
  };
}

function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

const SORT_CACHE_DURATION = 60 * 60 * 1000;

function shouldUpdateSort(): boolean {
  const lastSortTime = localStorage.getItem('lastSortTime');
  if (!lastSortTime) return true;

  const timeSinceLastSort = Date.now() - parseInt(lastSortTime);
  return timeSinceLastSort >= SORT_CACHE_DURATION;
}

function getCachedSortOrder(): string[] | null {
  const cached = localStorage.getItem('cachedSortOrder');
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

function setCachedSortOrder(outfitIds: string[]): void {
  localStorage.setItem('cachedSortOrder', JSON.stringify(outfitIds));
  localStorage.setItem('lastSortTime', Date.now().toString());
}

export default function Results({ outfits, context, onBack, onGenerate }: ResultsProps) {
  const { gender, bodyType, vibe, weather } = context;
  const [feedbackCounts, setFeedbackCounts] = useState<FeedbackCounts>({});
  const [sortedOutfits, setSortedOutfits] = useState<Outfit[]>(outfits);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstOutfitRef = useRef<HTMLDivElement>(null);

  const [newGender, setNewGender] = useState<string>(gender);
  const [newBodyType, setNewBodyType] = useState<string>(bodyType);
  const [newVibe, setNewVibe] = useState<string>(vibe);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRankingMode, setIsRankingMode] = useState(false);
  const [rankingOutfits, setRankingOutfits] = useState<Outfit[]>([]);

  const newGenderRef = useRef<HTMLDivElement>(null);
  const newBodyTypeRef = useRef<HTMLDivElement>(null);
  const newVibeRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 100;

  useEffect(() => {
    loadFeedbackCounts();
  }, [outfits]);

  useEffect(() => {
    if (isRankingMode && rankingOutfits.length > 0) {
      loadRankingFeedbackCounts();
    }
  }, [rankingOutfits, isRankingMode]);

  const loadRankingFeedbackCounts = async () => {
    const sessionId = getOrCreateSessionId();
    const outfitIds = rankingOutfits.map(o => o.id);

    try {
      const { data: feedbackData, error } = await supabase
        .from('outfit_feedback')
        .select('outfit_id, feedback_type, session_id')
        .in('outfit_id', outfitIds);

      if (error) throw error;

      const counts: FeedbackCounts = {};
      outfitIds.forEach(id => {
        const feedbackForOutfit = feedbackData?.filter(f => f.outfit_id === id) || [];
        const likes = feedbackForOutfit.filter(f => f.feedback_type === 'like').length;
        const dislikes = feedbackForOutfit.filter(f => f.feedback_type === 'dislike').length;
        const userFeedback = feedbackForOutfit.find(f => f.session_id === sessionId);

        counts[id] = {
          likes,
          dislikes,
          userFeedback: userFeedback ? userFeedback.feedback_type as 'like' | 'dislike' : null
        };
      });

      setFeedbackCounts(counts);
    } catch (error) {
      console.error('Failed to load ranking feedback counts:', error);
    }
  };

  useEffect(() => {
    if (shouldUpdateSort()) {
      const sorted = [...outfits].sort((a, b) => {
        const aLikes = feedbackCounts[a.id]?.likes || 0;
        const bLikes = feedbackCounts[b.id]?.likes || 0;
        return bLikes - aLikes;
      });
      setSortedOutfits(sorted);
      setCachedSortOrder(sorted.map(o => o.id));
    } else {
      const cachedOrder = getCachedSortOrder();
      if (cachedOrder) {
        const sorted = [...outfits].sort((a, b) => {
          const aIndex = cachedOrder.indexOf(a.id);
          const bIndex = cachedOrder.indexOf(b.id);
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
        setSortedOutfits(sorted);
      } else {
        const sorted = [...outfits].sort((a, b) => {
          const aLikes = feedbackCounts[a.id]?.likes || 0;
          const bLikes = feedbackCounts[b.id]?.likes || 0;
          return bLikes - aLikes;
        });
        setSortedOutfits(sorted);
        setCachedSortOrder(sorted.map(o => o.id));
      }
    }
  }, [outfits, feedbackCounts]);

  const loadFeedbackCounts = async () => {
    const sessionId = getOrCreateSessionId();
    const outfitIds = outfits.map(o => o.id);

    try {
      const { data: feedbackData, error } = await supabase
        .from('outfit_feedback')
        .select('outfit_id, feedback_type, session_id')
        .in('outfit_id', outfitIds);

      if (error) throw error;

      const counts: FeedbackCounts = {};
      outfitIds.forEach(id => {
        const feedbackForOutfit = feedbackData?.filter(f => f.outfit_id === id) || [];
        const likes = feedbackForOutfit.filter(f => f.feedback_type === 'like').length;
        const dislikes = feedbackForOutfit.filter(f => f.feedback_type === 'dislike').length;
        const userFeedback = feedbackForOutfit.find(f => f.session_id === sessionId);

        counts[id] = {
          likes,
          dislikes,
          userFeedback: userFeedback ? userFeedback.feedback_type as 'like' | 'dislike' : null
        };
      });

      setFeedbackCounts(counts);
    } catch (error) {
      console.error('Failed to load feedback counts:', error);
    }
  };

  const handleFeedback = async (outfitId: string, feedbackType: 'like' | 'dislike') => {
    const sessionId = getOrCreateSessionId();

    try {
      const currentFeedback = feedbackCounts[outfitId]?.userFeedback;

      if (currentFeedback === feedbackType) {
        await supabase
          .from('outfit_feedback')
          .delete()
          .eq('outfit_id', outfitId)
          .eq('session_id', sessionId);

        await loadFeedbackCounts();
        return;
      }

      if (currentFeedback) {
        await supabase
          .from('outfit_feedback')
          .delete()
          .eq('outfit_id', outfitId)
          .eq('session_id', sessionId);
      }

      const { error } = await supabase
        .from('outfit_feedback')
        .insert({
          outfit_id: outfitId,
          feedback_type: feedbackType,
          session_id: sessionId
        });

      if (error) throw error;

      await loadFeedbackCounts();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleTodayRanking = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data: allOutfits, error: outfitsError } = await supabase
        .from('outfits')
        .select('*')
        .eq('gender', gender)
        .eq('body_type', bodyType);

      if (outfitsError) throw outfitsError;
      if (!allOutfits || allOutfits.length === 0) {
        setIsRankingMode(true);
        setRankingOutfits([]);
        return;
      }

      const outfitIds = allOutfits.map(o => o.id);

      const { data: feedbackData, error: feedbackError } = await supabase
        .from('outfit_feedback')
        .select('outfit_id, feedback_type, created_at')
        .in('outfit_id', outfitIds)
        .gte('created_at', todayISO);

      if (feedbackError) throw feedbackError;

      const likeCounts: { [key: string]: number } = {};
      feedbackData?.forEach(f => {
        if (f.feedback_type === 'like') {
          likeCounts[f.outfit_id] = (likeCounts[f.outfit_id] || 0) + 1;
        }
      });

      const sortedByLikes = [...allOutfits].sort((a, b) => {
        const aLikes = likeCounts[a.id] || 0;
        const bLikes = likeCounts[b.id] || 0;
        return bLikes - aLikes;
      });

      setRankingOutfits(sortedByLikes);
      setIsRankingMode(true);

      setTimeout(() => {
        if (firstOutfitRef.current) {
          firstOutfitRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      console.error('Failed to load today\'s ranking:', error);
    }
  };

  const handleBackToNormal = () => {
    setIsRankingMode(false);
    setTimeout(() => {
      if (firstOutfitRef.current) {
        firstOutfitRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

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
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe) {
      onBack();
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

      const updateSelection = () => {
        const centeredItem = getCenteredItem();
        if (centeredItem) {
          const value = centeredItem.getAttribute('data-value');
          if (value) {
            setState(value);
          }
        }
      };

      const firstItem = items[0] as HTMLElement;
      const containerHeight = container.clientHeight;
      const itemHeight = firstItem.clientHeight;
      const targetScrollTop = firstItem.offsetTop - (containerHeight / 2) + (itemHeight / 2);
      container.scrollTop = targetScrollTop;

      updateSelection();

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

    const cleanup1 = setupScrollPicker(newGenderRef, GENDER_OPTIONS, setNewGender);
    const cleanup2 = setupScrollPicker(newBodyTypeRef, BODY_TYPE_OPTIONS, setNewBodyType);
    const cleanup3 = setupScrollPicker(newVibeRef, VIBE_OPTIONS, setNewVibe);

    return () => {
      cleanup1?.();
      cleanup2?.();
      cleanup3?.();
    };
  }, []);

  const handleNewGenerate = () => {
    if (!weather) return;

    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      onGenerate(newGender, newBodyType, newVibe, weather);
    }, 800);
  };

  return (
    <div
      ref={containerRef}
      className="h-screen flex flex-col bg-white"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <img
              src="/logo.png"
              alt="SLOT EDIT"
              className="h-12"
            />
            {weather && (
              <div className="text-sm text-gray-700 font-medium">
                {getWeatherEmoji(weather.condition)} {weather.temperature}°F
              </div>
            )}
          </div>
          <div className="text-center mb-2">
            <p className="text-xs text-gray-600 font-light">
              {gender} · {bodyType} · {isRankingMode ? 'ALL VIBES' : vibe}
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm">
            <button
              onClick={handleBackToNormal}
              className={`font-light transition-colors ${
                !isRankingMode ? 'text-black font-medium' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              HOME
            </button>
            <span className="text-gray-300">/</span>
            <button
              onClick={handleTodayRanking}
              className={`font-light transition-colors ${
                isRankingMode ? 'text-black font-medium' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              TODAY's Ranking
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pt-[148px] pb-8">

        {(isRankingMode ? rankingOutfits : sortedOutfits).length === 0 ? (
          <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
            <div className="px-6 text-center max-w-md mx-auto">
              <div className="mb-6">
                <div className="text-6xl mb-4">👔</div>
                <h2 className="text-xl font-light mb-3">No Outfits Found</h2>
                <p className="text-gray-500 font-light text-sm leading-relaxed">
                  {isRankingMode ? (
                    <>No outfits with likes today for <span className="font-medium">{gender} · {bodyType}</span>. Check back later!</>
                  ) : (
                    <>We don't have outfit recommendations for <span className="font-medium">{gender} · {bodyType} · {vibe}</span> yet.
                    Try a different combination or check back soon!</>
                  )}
                </p>
              </div>
              <button
                onClick={onBack}
                className="px-6 py-3 text-sm tracking-wider font-light uppercase border border-black hover:bg-black hover:text-white transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          (isRankingMode ? rankingOutfits : sortedOutfits).map((outfit, index) => {
            const images = [];

            if (outfit.image_url_flatlay1) {
              images.push({ url: outfit.image_url_flatlay1, label: 'Flatlay 1' });
            }

            if (outfit.image_url_flatlay2) {
              images.push({ url: outfit.image_url_flatlay2, label: 'Flatlay 2' });
            }

            if (outfit.image_url_on_model) {
              images.push({ url: outfit.image_url_on_model, label: 'On Model' });
            }

            const feedback = feedbackCounts[outfit.id] || { likes: 0, dislikes: 0, userFeedback: null };

            return (
              <div
                key={outfit.id}
                ref={index === 0 ? firstOutfitRef : null}
                className="mb-12 flex flex-col md:flex-row md:items-start md:justify-center md:gap-8 md:px-12"
              >
                <div className="flex-shrink-0 w-full md:w-[500px] mb-6 md:mb-0">
                  <ImageSlider
                    images={images}
                    alt={`Look ${index + 1}`}
                    outfitNumber={index + 1}
                    outfitId={outfit.id}
                    onFeedback={handleFeedback}
                    likeCount={feedback.likes}
                    dislikeCount={feedback.dislikes}
                    userFeedback={feedback.userFeedback}
                    outfit={outfit}
                  />
                </div>

                <div className="w-full md:w-[500px] px-6 md:px-0 flex flex-col">
                  <div className="text-xs font-bold tracking-widest text-black uppercase mb-4">
                    AI INSIGHT
                  </div>
                  <p className="text-sm leading-relaxed font-light text-gray-800">
                    {outfit.insight_text}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {sortedOutfits.length > 0 && (
          <div className="mt-16 mb-8 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="w-full border-t border-gray-200 mb-12"></div>
              <h2 className="text-2xl font-bold text-center mb-2">
                COMING SOON
              </h2>
              <p className="text-sm text-gray-600 font-light text-center mb-6">
                Your next curated flatlay is being styled.<br />
                We're preparing a new look — inspired by New York trends and your selected vibe.<br />
                Every combination is refined with fit, tone, and texture in mind.
              </p>

              <div className="mb-8">
                <h3 className="text-lg font-bold text-center mb-6">
                  → Explore another slot
                </h3>
                <p className="text-sm text-gray-600 font-light text-center mb-6">
                  Discover fresh directions and new fashion moods.
                </p>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <h4 className="text-xs font-light tracking-widest text-gray-400 uppercase mb-3">
                      Weather
                    </h4>
                  </div>
                  <div className="text-center">
                    <h4 className="text-xs font-light tracking-widest text-gray-400 uppercase mb-3">
                      Gender
                    </h4>
                  </div>
                  <div className="text-center">
                    <h4 className="text-xs font-light tracking-widest text-gray-400 uppercase mb-3">
                      Body Type
                    </h4>
                  </div>
                  <div className="text-center">
                    <h4 className="text-xs font-light tracking-widest text-gray-400 uppercase mb-3">
                      Vibe
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 pointer-events-none z-10">
                      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
                    </div>
                    <div className="h-[200px] flex flex-col items-center justify-center">
                      {weather ? (
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">
                            {weather.location}
                          </div>
                          <div className="text-xl font-semibold text-black mb-1">
                            {weather.temperature}°F
                          </div>
                          <div className="text-sm text-gray-700">
                            {getWeatherEmoji(weather.condition)} {weather.condition}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-lg text-gray-400">--°F</div>
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
                      ref={newGenderRef}
                      className="h-[200px] overflow-y-scroll scroll-smooth snap-y snap-mandatory scrollbar-hide"
                      style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch'
                      }}
                    >
                      <div className="h-[76px]" />
                      {GENDER_OPTIONS.map((option) => (
                        <div
                          key={option}
                          data-scroll-item
                          data-value={option}
                          className="h-12 snap-center flex items-center justify-center transition-all duration-200"
                        >
                          <span
                            className={`tracking-wider uppercase transition-all duration-200 ${
                              newGender === option
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
                      ref={newBodyTypeRef}
                      className="h-[200px] overflow-y-scroll scroll-smooth snap-y snap-mandatory scrollbar-hide"
                      style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch'
                      }}
                    >
                      <div className="h-[76px]" />
                      {BODY_TYPE_OPTIONS.map((option) => (
                        <div
                          key={option}
                          data-scroll-item
                          data-value={option}
                          className="h-12 snap-center flex items-center justify-center transition-all duration-200"
                        >
                          <span
                            className={`tracking-wider uppercase transition-all duration-200 ${
                              newBodyType === option
                                ? 'text-base font-bold text-black'
                                : 'text-sm font-normal text-gray-600'
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
                      ref={newVibeRef}
                      className="h-[200px] overflow-y-scroll scroll-smooth snap-y snap-mandatory scrollbar-hide"
                      style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch'
                      }}
                    >
                      <div className="h-[76px]" />
                      {VIBE_OPTIONS.map((option) => (
                        <div
                          key={option}
                          data-scroll-item
                          data-value={option}
                          className="h-12 snap-center flex items-center justify-center transition-all duration-200"
                        >
                          <span
                            className={`tracking-wider uppercase transition-all duration-200 text-center px-2 ${
                              newVibe === option
                                ? 'text-sm font-bold text-black'
                                : 'text-xs font-normal text-gray-600'
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

              <button
                onClick={handleNewGenerate}
                disabled={!weather || isGenerating}
                className={`w-full py-5 px-8 text-base tracking-widest font-normal uppercase transition-all ${
                  weather && !isGenerating
                    ? 'bg-black text-white hover:bg-gray-900 cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isGenerating ? 'Finding your look...' : 'Generate New Look'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
