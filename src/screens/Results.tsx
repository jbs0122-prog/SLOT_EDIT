import { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
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

export default function Results({ outfits, context, onBack }: ResultsProps) {
  const { gender, bodyType, vibe, weather } = context;
  const [feedbackCounts, setFeedbackCounts] = useState<FeedbackCounts>({});
  const [sortedOutfits, setSortedOutfits] = useState<Outfit[]>(outfits);

  useEffect(() => {
    loadFeedbackCounts();
  }, [outfits]);

  useEffect(() => {
    const sorted = [...outfits].sort((a, b) => {
      const aLikes = feedbackCounts[a.id]?.likes || 0;
      const bLikes = feedbackCounts[b.id]?.likes || 0;
      return bLikes - aLikes;
    });
    setSortedOutfits(sorted);
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
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory bg-white">
      {sortedOutfits.length === 0 ? (
        <div className="h-screen flex items-center justify-center snap-start">
          <div className="px-6 text-center max-w-md mx-auto">
            <button
              onClick={onBack}
              className="absolute top-6 left-6 p-2 hover:bg-gray-50 transition-colors flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-light">Back</span>
            </button>
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
                className="h-screen snap-start flex flex-col overflow-y-auto relative"
              >
                {index === 0 && (
                  <button
                    onClick={onBack}
                    className="absolute top-6 left-6 z-30 p-2 hover:bg-gray-50 transition-colors flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded shadow-sm"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-light">Back</span>
                  </button>
                )}

                {weather && index === 0 && (
                  <div className="absolute top-6 right-6 z-30 text-sm text-gray-600 font-light bg-white/90 backdrop-blur-sm px-3 py-2 rounded shadow-sm">
                    {getWeatherEmoji(weather.condition)} {weather.temperature}°F
                  </div>
                )}

                <div className="flex-shrink-0">
                  <ImageSlider
                    images={images}
                    alt={`Look ${index + 1}`}
                    outfitNumber={index + 1}
                    outfitId={outfit.id}
                    onFeedback={handleFeedback}
                    likeCount={feedback.likes}
                    dislikeCount={feedback.dislikes}
                    userFeedback={feedback.userFeedback}
                  />
                </div>

                <div className="flex-1 px-6 py-6 overflow-y-auto">
                  <div className="mb-6">
                    <div className="text-xs font-light tracking-widest text-gray-400 uppercase mb-3">
                      AI Insight
                    </div>
                    <p className="text-base leading-relaxed font-light text-gray-800">
                      {outfit.insight_text}
                    </p>
                  </div>

                  <div className="pb-6">
                    <div className="text-xs font-bold tracking-widest text-black uppercase mb-4">
                      SHOP THE CONTEXT
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <a
                        href={outfit.top_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group"
                      >
                        <div className="mb-3">
                          <img
                            src={outfit.top_image}
                            alt={outfit.top_name}
                            className="w-full aspect-square object-cover border border-gray-200 group-hover:border-black transition-colors"
                          />
                        </div>
                        <div className="text-xs font-light text-gray-600 mb-2 leading-tight">
                          {outfit.top_name}
                        </div>
                        <button className="w-full py-2 px-3 text-xs tracking-wider font-light uppercase border border-black transition-all group-hover:bg-black group-hover:text-white flex items-center justify-center gap-1">
                          Shop Top
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </a>

                      <a
                        href={outfit.bottom_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group"
                      >
                        <div className="mb-3">
                          <img
                            src={outfit.bottom_image}
                            alt={outfit.bottom_name}
                            className="w-full aspect-square object-cover border border-gray-200 group-hover:border-black transition-colors"
                          />
                        </div>
                        <div className="text-xs font-light text-gray-600 mb-2 leading-tight">
                          {outfit.bottom_name}
                        </div>
                        <button className="w-full py-2 px-3 text-xs tracking-wider font-light uppercase border border-black transition-all group-hover:bg-black group-hover:text-white flex items-center justify-center gap-1">
                          Shop Bottom
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </a>

                      <a
                        href={outfit.shoes_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group"
                      >
                        <div className="mb-3">
                          <img
                            src={outfit.shoes_image}
                            alt={outfit.shoes_name}
                            className="w-full aspect-square object-cover border border-gray-200 group-hover:border-black transition-colors"
                          />
                        </div>
                        <div className="text-xs font-light text-gray-600 mb-2 leading-tight">
                          {outfit.shoes_name}
                        </div>
                        <button className="w-full py-2 px-3 text-xs tracking-wider font-light uppercase border border-black transition-all group-hover:bg-black group-hover:text-white flex items-center justify-center gap-1">
                          Shop Shoes
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
    </div>
  );
}
