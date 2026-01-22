import { useState, useEffect, useRef, TouchEvent } from 'react';
import { Outfit } from '../data/outfits';
import { WeatherData, getWeatherEmoji } from '../utils/weather';
import ImageSlider from './ImageSlider';
import { supabase } from '../utils/supabase';
import { fetchRankingOutfits } from '../utils/outfitService';

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

export default function Results({ outfits, context, onBack, onGenerate }: ResultsProps) {
  const { gender, bodyType, vibe, weather } = context;
  const [feedbackCounts, setFeedbackCounts] = useState<FeedbackCounts>({});
  const [sortedOutfits, setSortedOutfits] = useState<Outfit[]>(outfits);
  const [sortOrder, setSortOrder] = useState<'likes' | 'latest'>('likes');
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstOutfitRef = useRef<HTMLDivElement>(null);

  const [newGender, setNewGender] = useState<string>(gender);
  const [newBodyType, setNewBodyType] = useState<string>(bodyType);
  const [newVibe, setNewVibe] = useState<string>(vibe);
  const [isGenerating, setIsGenerating] = useState(false);
  const [rankingGender, setRankingGender] = useState<'MALE' | 'FEMALE' | null>(null);
  const [rankingOutfits, setRankingOutfits] = useState<Outfit[]>([]);

  const [openDropdown, setOpenDropdown] = useState<'gender' | 'bodyType' | 'vibe' | null>(null);
  const [currentGender, setCurrentGender] = useState<string>(gender);
  const [currentBodyType, setCurrentBodyType] = useState<string>(bodyType);
  const [currentVibe, setCurrentVibe] = useState<string>(vibe);

  const newGenderRef = useRef<HTMLDivElement>(null);
  const newBodyTypeRef = useRef<HTMLDivElement>(null);
  const newVibeRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 100;

  useEffect(() => {
    loadFeedbackCounts();
    if (containerRef.current) {
      const scrollableDiv = containerRef.current.querySelector('.overflow-y-auto');
      if (scrollableDiv) {
        scrollableDiv.scrollTop = 0;
      }
    }
  }, [outfits]);

  useEffect(() => {
    if (rankingGender && rankingOutfits.length > 0) {
      loadRankingFeedbackCounts();
    }
  }, [rankingOutfits, rankingGender]);

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
    const sorted = [...outfits].sort((a, b) => {
      if (sortOrder === 'likes') {
        const aLikes = feedbackCounts[a.id]?.likes || 0;
        const bLikes = feedbackCounts[b.id]?.likes || 0;
        return bLikes - aLikes;
      } else {
        return 0;
      }
    });
    setSortedOutfits(sorted);
  }, [outfits, feedbackCounts, sortOrder]);

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

  const handleMensRanking = async () => {
    try {
      const outfits = await fetchRankingOutfits('MALE');
      setRankingOutfits(outfits);
      setRankingGender('MALE');

      setTimeout(() => {
        if (containerRef.current) {
          const scrollableDiv = containerRef.current.querySelector('.overflow-y-auto');
          if (scrollableDiv) {
            scrollableDiv.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      }, 100);
    } catch (error) {
      console.error('Failed to load men\'s ranking:', error);
    }
  };

  const handleWomensRanking = async () => {
    try {
      const outfits = await fetchRankingOutfits('FEMALE');
      setRankingOutfits(outfits);
      setRankingGender('FEMALE');

      setTimeout(() => {
        if (containerRef.current) {
          const scrollableDiv = containerRef.current.querySelector('.overflow-y-auto');
          if (scrollableDiv) {
            scrollableDiv.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      }, 100);
    } catch (error) {
      console.error('Failed to load women\'s ranking:', error);
    }
  };

  const handleBackToNormal = () => {
    setRankingGender(null);
    setTimeout(() => {
      if (containerRef.current) {
        const scrollableDiv = containerRef.current.querySelector('.overflow-y-auto');
        if (scrollableDiv) {
          scrollableDiv.scrollTo({ top: 0, behavior: 'smooth' });
        }
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

  const handleDropdownSelect = (type: 'gender' | 'bodyType' | 'vibe', value: string) => {
    if (!weather) return;

    setOpenDropdown(null);
    setIsGenerating(true);

    let selectedGender = currentGender;
    let selectedBodyType = currentBodyType;
    let selectedVibe = currentVibe;

    if (type === 'gender') {
      selectedGender = value;
      setCurrentGender(value);
    } else if (type === 'bodyType') {
      selectedBodyType = value;
      setCurrentBodyType(value);
    } else if (type === 'vibe') {
      selectedVibe = value;
      setCurrentVibe(value);
    }

    setTimeout(() => {
      setIsGenerating(false);
      onGenerate(selectedGender, selectedBodyType, selectedVibe, weather);
    }, 800);
  };

  useEffect(() => {
    setCurrentGender(gender);
    setCurrentBodyType(bodyType);
    setCurrentVibe(vibe);
  }, [gender, bodyType, vibe]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openDropdown]);

  return (
    <div
      ref={containerRef}
      className="h-screen flex flex-col md:flex-row bg-white relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isGenerating && (
        <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-light tracking-wider uppercase animate-pulse">
              Finding your look...
            </div>
          </div>
        </div>
      )}
      <header className="fixed md:sticky top-0 left-0 right-0 md:left-auto md:right-auto bg-white z-50 border-b md:border-b-0 md:border-r border-gray-200 md:h-screen md:w-[400px] flex-shrink-0">
        <div className="px-6 py-4 md:py-8">
          <div className="flex md:flex-col items-center md:items-start justify-between md:justify-start mb-3 md:mb-8">
            <img
              src="/logo.png"
              alt="SLOT EDIT"
              className="h-12 md:h-24"
            />
            {weather && (
              <div className="text-sm md:text-2xl text-gray-700 font-medium md:mt-6">
                {getWeatherEmoji(weather.condition)} {weather.temperature}°F
              </div>
            )}
          </div>
          <div className="mb-2 md:mb-6 relative">
            <div className="flex flex-wrap items-center gap-2 text-xs md:text-xl text-gray-600 font-light">
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'gender' ? null : 'gender')}
                  className="hover:text-black transition-colors cursor-pointer uppercase"
                  disabled={!!rankingGender}
                >
                  {rankingGender || currentGender}
                </button>
                {openDropdown === 'gender' && !rankingGender && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg z-50 min-w-[120px]">
                    {GENDER_OPTIONS.map((option) => (
                      <button
                        key={option}
                        onClick={() => handleDropdownSelect('gender', option)}
                        className={`block w-full text-left px-4 py-2 text-xs md:text-base uppercase hover:bg-gray-100 transition-colors ${
                          option === currentGender ? 'font-medium bg-gray-50' : ''
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span>·</span>
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'bodyType' ? null : 'bodyType')}
                  className="hover:text-black transition-colors cursor-pointer uppercase"
                  disabled={!!rankingGender}
                >
                  {rankingGender ? 'ALL BODY TYPES' : currentBodyType}
                </button>
                {openDropdown === 'bodyType' && !rankingGender && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg z-50 min-w-[120px]">
                    {BODY_TYPE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        onClick={() => handleDropdownSelect('bodyType', option)}
                        className={`block w-full text-left px-4 py-2 text-xs md:text-base uppercase hover:bg-gray-100 transition-colors ${
                          option === currentBodyType ? 'font-medium bg-gray-50' : ''
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span>·</span>
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'vibe' ? null : 'vibe')}
                  className="hover:text-black transition-colors cursor-pointer uppercase"
                  disabled={!!rankingGender}
                >
                  {rankingGender ? 'ALL VIBES' : currentVibe}
                </button>
                {openDropdown === 'vibe' && !rankingGender && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg z-50 min-w-[180px] md:min-w-[240px]">
                    {VIBE_OPTIONS.map((option) => (
                      <button
                        key={option}
                        onClick={() => handleDropdownSelect('vibe', option)}
                        className={`block w-full text-left px-4 py-2 text-xs md:text-base uppercase hover:bg-gray-100 transition-colors ${
                          option === currentVibe ? 'font-medium bg-gray-50' : ''
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-4 mb-2 md:mb-4">
              <div className="flex items-center gap-2 text-sm md:text-2xl">
                <button
                  onClick={handleBackToNormal}
                  className={`font-light transition-colors ${
                    !rankingGender ? 'text-black font-medium' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  HOME
                </button>
              </div>
              {!rankingGender && (
                <div className="flex flex-wrap items-center gap-2 text-xs md:text-xl">
                  <button
                    onClick={() => setSortOrder('likes')}
                    className={`font-light transition-colors uppercase ${
                      sortOrder === 'likes' ? 'text-black font-medium' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Most Liked
                  </button>
                  <span className="text-gray-300">/</span>
                  <button
                    onClick={() => setSortOrder('latest')}
                    className={`font-light transition-colors uppercase ${
                      sortOrder === 'latest' ? 'text-black font-medium' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Latest
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-col md:flex-col items-start gap-2 text-sm md:text-2xl">
              <button
                onClick={handleMensRanking}
                className={`font-light transition-colors ${
                  rankingGender === 'MALE' ? 'text-black font-medium' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Men's Ranking
              </button>
              <button
                onClick={handleWomensRanking}
                className={`font-light transition-colors ${
                  rankingGender === 'FEMALE' ? 'text-black font-medium' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Women's Ranking
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pt-[148px] md:pt-0 pb-8">

        {(rankingGender ? rankingOutfits : sortedOutfits).length === 0 ? (
          <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
            <div className="px-6 text-center max-w-md mx-auto">
              <div className="mb-6">
                <div className="text-6xl mb-4">👔</div>
                <h2 className="text-xl font-light mb-3">No Outfits Found</h2>
                <p className="text-gray-500 font-light text-sm leading-relaxed">
                  {rankingGender ? (
                    <>No outfits with likes yet for <span className="font-medium">{rankingGender === 'MALE' ? 'Men' : 'Women'}</span>. Check back later!</>
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
          (rankingGender ? rankingOutfits : sortedOutfits).map((outfit, index) => {
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
                className={`mb-12 flex flex-col md:flex-row md:items-start md:justify-center md:gap-8 md:px-12 ${index === 0 ? 'md:mt-8' : ''}`}
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
                    showOutfitInfo={!!rankingGender}
                  />
                </div>

                <div className="w-full md:w-[500px] px-6 md:px-0 flex flex-col">
                  <div className="text-xs md:text-2xl font-bold tracking-widest text-black uppercase mb-4">
                    AI INSIGHT
                  </div>
                  <p className="text-sm md:text-xl leading-relaxed font-light text-gray-800">
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
              <h2 className="text-2xl md:text-4xl font-bold text-center mb-2">
                COMING SOON
              </h2>
              <p className="text-sm md:text-xl text-gray-600 font-light text-center mb-6">
                Your next curated flatlay is being styled.<br />
                We're preparing a new look — inspired by New York trends and your selected vibe.<br />
                Every combination is refined with fit, tone, and texture in mind.
              </p>

              <div className="mb-8">
                <h3 className="text-lg md:text-3xl font-bold text-center mb-6">
                  → Explore another slot
                </h3>
                <p className="text-sm md:text-xl text-gray-600 font-light text-center mb-6">
                  Discover fresh directions and new fashion moods.
                </p>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <h4 className="text-xs md:text-lg font-light tracking-widest text-gray-400 uppercase mb-3">
                      Weather
                    </h4>
                  </div>
                  <div className="text-center">
                    <h4 className="text-xs md:text-lg font-light tracking-widest text-gray-400 uppercase mb-3">
                      Gender
                    </h4>
                  </div>
                  <div className="text-center">
                    <h4 className="text-xs md:text-lg font-light tracking-widest text-gray-400 uppercase mb-3">
                      Body Type
                    </h4>
                  </div>
                  <div className="text-center">
                    <h4 className="text-xs md:text-lg font-light tracking-widest text-gray-400 uppercase mb-3">
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
                          <div className="text-xs md:text-lg text-gray-500 mb-1">
                            {weather.location}
                          </div>
                          <div className="text-xl md:text-3xl font-semibold text-black mb-1">
                            {weather.temperature}°F
                          </div>
                          <div className="text-sm md:text-xl text-gray-700">
                            {getWeatherEmoji(weather.condition)} {weather.condition}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-lg md:text-3xl text-gray-400">--°F</div>
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
                                ? 'text-lg md:text-3xl font-bold text-black'
                                : 'text-base md:text-2xl font-normal text-gray-600'
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
                                ? 'text-base md:text-2xl font-bold text-black'
                                : 'text-sm md:text-xl font-normal text-gray-600'
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
                                ? 'text-sm md:text-xl font-bold text-black'
                                : 'text-xs md:text-lg font-normal text-gray-600'
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
                className={`w-full py-5 px-8 text-base md:text-2xl tracking-widest font-normal uppercase transition-all ${
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
