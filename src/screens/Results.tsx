import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
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
}

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

export default function Results({ outfits, context, onBack }: ResultsProps) {
  const { gender, bodyType, vibe, weather } = context;
  const [feedbackCounts, setFeedbackCounts] = useState<FeedbackCounts>({});
  const [sortedOutfits, setSortedOutfits] = useState<Outfit[]>(outfits);

  useEffect(() => {
    loadFeedbackCounts();
  }, [outfits]);

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

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="fixed top-0 left-0 right-0 bg-white z-50 border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-center mb-3">
            <h1 className="text-2xl font-bold tracking-tight">
              SLOT EDIT
            </h1>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-1 hover:bg-gray-50 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-light tracking-tight">
                NYC Trend Drop
              </h2>
            </div>
            {weather && (
              <div className="text-sm text-gray-600 font-light">
                {getWeatherEmoji(weather.condition)} {weather.temperature}°F
              </div>
            )}
          </div>
          <div className="pl-9">
            <p className="text-xs text-gray-500 font-light">
              {gender} · {bodyType} · {vibe}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pt-[120px] pb-8">
        {sortedOutfits.length === 0 ? (
          <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
            <div className="px-6 text-center max-w-md mx-auto">
              <div className="mb-6">
                <div className="text-6xl mb-4">👔</div>
                <h2 className="text-xl font-light mb-3">No Outfits Found</h2>
                <p className="text-gray-500 font-light text-sm leading-relaxed">
                  We don't have outfit recommendations for <span className="font-medium">{gender} · {bodyType} · {vibe}</span> yet.
                  Try a different combination or check back soon!
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
          sortedOutfits.map((outfit, index) => {
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
      </div>
    </div>
  );
}
