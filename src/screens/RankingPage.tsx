import { useState, useEffect } from 'react';
import { Outfit, Product } from '../data/outfits';
import { supabase } from '../utils/supabase';
import { fetchRankingOutfits } from '../utils/outfitService';
import ImageSlider from './ImageSlider';
import { Bookmark } from 'lucide-react';
import { useAuth } from '../utils/AuthContext';

interface RankingPageProps {
  gender: 'MALE' | 'FEMALE';
  onRequestLogin: () => void;
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

export default function RankingPage({ gender, onRequestLogin }: RankingPageProps) {
  const { user } = useAuth();
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackCounts, setFeedbackCounts] = useState<FeedbackCounts>({});
  const [outfitProducts, setOutfitProducts] = useState<{ [id: string]: Product[] }>({});
  const [savedOutfitIds, setSavedOutfitIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRanking();
  }, [gender]);

  useEffect(() => {
    if (outfits.length > 0) {
      loadFeedbackCounts();
      loadProducts();
    }
  }, [outfits]);

  useEffect(() => {
    if (user) loadSavedOutfits();
  }, [user]);

  const loadRanking = async () => {
    setLoading(true);
    const data = await fetchRankingOutfits(gender);
    setOutfits(data);
    setLoading(false);
  };

  const loadFeedbackCounts = async () => {
    const sessionId = getOrCreateSessionId();
    const outfitIds = outfits.map(o => o.id);

    const { data, error } = await supabase
      .from('outfit_feedback')
      .select('outfit_id, feedback_type, session_id')
      .in('outfit_id', outfitIds);

    if (error) return;

    const counts: FeedbackCounts = {};
    outfitIds.forEach(id => {
      const items = data?.filter(f => f.outfit_id === id) || [];
      counts[id] = {
        likes: items.filter(f => f.feedback_type === 'like').length,
        dislikes: items.filter(f => f.feedback_type === 'dislike').length,
        userFeedback: items.find(f => f.session_id === sessionId)?.feedback_type as 'like' | 'dislike' | null ?? null,
      };
    });
    setFeedbackCounts(counts);
  };

  const loadProducts = async () => {
    const outfitIds = outfits.map(o => o.id);

    const pinProductIds = new Set<string>();
    outfits.forEach(o => {
      (o.flatlay_pins || []).forEach(p => { if (p.product_id) pinProductIds.add(p.product_id); });
      (o.on_model_pins || []).forEach(p => { if (p.product_id) pinProductIds.add(p.product_id); });
    });

    const { data: itemsData } = await supabase
      .from('outfit_items')
      .select('outfit_id, product_id')
      .in('outfit_id', outfitIds);

    const allIds = new Set<string>();
    itemsData?.forEach(i => allIds.add(i.product_id));
    pinProductIds.forEach(id => allIds.add(id));

    if (allIds.size === 0) return;

    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', [...allIds]);

    if (!products) return;

    const map: { [id: string]: Product[] } = {};

    itemsData?.forEach(item => {
      const p = products.find(pr => pr.id === item.product_id);
      if (p) {
        if (!map[item.outfit_id]) map[item.outfit_id] = [];
        map[item.outfit_id].push(mapProduct(p));
      }
    });

    outfits.forEach(o => {
      const pins = [...(o.flatlay_pins || []), ...(o.on_model_pins || [])];
      if (!map[o.id]) map[o.id] = [];
      const existing = new Set(map[o.id].map(p => p.id));
      pins.forEach(pin => {
        if (pin.product_id && !existing.has(pin.product_id)) {
          const p = products.find(pr => pr.id === pin.product_id);
          if (p) map[o.id].push(mapProduct(p));
        }
      });
    });

    setOutfitProducts(map);
  };

  const loadSavedOutfits = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('saved_outfits')
      .select('outfit_id')
      .eq('user_id', user.id);
    if (data) setSavedOutfitIds(new Set(data.map(d => d.outfit_id)));
  };

  const handleSave = async (outfitId: string) => {
    if (!user) { onRequestLogin(); return; }
    const isSaved = savedOutfitIds.has(outfitId);

    if (isSaved) {
      await supabase.from('saved_outfits').delete().eq('user_id', user.id).eq('outfit_id', outfitId);
      setSavedOutfitIds(prev => { const n = new Set(prev); n.delete(outfitId); return n; });
    } else {
      await supabase.from('saved_outfits').insert({ user_id: user.id, outfit_id: outfitId });
      setSavedOutfitIds(prev => new Set(prev).add(outfitId));
    }
  };

  const handleFeedback = async (outfitId: string, feedbackType: 'like' | 'dislike') => {
    const sessionId = getOrCreateSessionId();
    const current = feedbackCounts[outfitId]?.userFeedback;

    if (current === feedbackType) {
      await supabase.from('outfit_feedback').delete().eq('outfit_id', outfitId).eq('session_id', sessionId);
    } else {
      if (current) {
        await supabase.from('outfit_feedback').delete().eq('outfit_id', outfitId).eq('session_id', sessionId);
      }
      await supabase.from('outfit_feedback').insert({ outfit_id: outfitId, feedback_type: feedbackType, session_id: sessionId });
    }
    await loadFeedbackCounts();
  };

  const mapProduct = (p: any): Product => ({
    id: p.id, brand: p.brand || '', name: p.name, category: p.category,
    gender: p.gender, body_type: p.body_type || [], vibe: p.vibe || [],
    color: p.color || '', season: p.season || [], silhouette: p.silhouette || '',
    image_url: p.image_url, product_link: p.product_link || '',
    affiliate_link: p.affiliate_link || '', price: p.price,
    stock_status: p.stock_status || 'in_stock',
    material: p.material || '', color_family: p.color_family || '',
    color_tone: p.color_tone || '', sub_category: p.sub_category || '',
    pattern: p.pattern || '',
    formality: typeof p.formality === 'number' ? p.formality : undefined,
    warmth: typeof p.warmth === 'number' ? p.warmth : undefined,
    nobg_image_url: p.nobg_image_url || '',
    created_at: p.created_at, updated_at: p.updated_at,
  });

  const getTotalPrice = (outfitId: string): number => {
    return (outfitProducts[outfitId] || []).reduce((s, p) => s + (p.price || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg font-light tracking-wider uppercase animate-pulse">Loading...</div>
      </div>
    );
  }

  if (outfits.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center px-6">
          <h2 className="text-xl font-light mb-3">No Rankings Yet</h2>
          <p className="text-gray-500 font-light text-sm">
            No outfits with likes yet for {gender === 'MALE' ? "Men's" : "Women's"} ranking. Check back later!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-8">
      <div className="px-6 py-6 border-b border-gray-100">
        <h1 className="text-xl md:text-2xl font-bold tracking-wider uppercase">
          {gender === 'MALE' ? "Men's" : "Women's"} Ranking
        </h1>
        <p className="text-xs md:text-sm text-gray-500 font-light mt-1">Top outfits by community likes</p>
      </div>

      {outfits.map((outfit, index) => {
        const images = [];
        if (outfit.image_url_flatlay) images.push({ url: outfit.image_url_flatlay, label: 'Flatlay', tpo: outfit.tpo });
        if (outfit.image_url_on_model) images.push({ url: outfit.image_url_on_model, label: 'On Model', tpo: outfit.tpo });

        const feedback = feedbackCounts[outfit.id] || { likes: 0, dislikes: 0, userFeedback: null };
        const isSaved = savedOutfitIds.has(outfit.id);
        const totalPrice = getTotalPrice(outfit.id);

        return (
          <div key={outfit.id} className="mb-10 flex flex-col md:flex-row md:items-start md:justify-center md:gap-8 md:px-12">
            <div className="flex-shrink-0 w-full md:w-[500px] mb-4 md:mb-0 relative">
              <ImageSlider
                images={images}
                alt={`Rank ${index + 1}`}
                outfitNumber={index + 1}
                outfitId={outfit.id}
                onFeedback={handleFeedback}
                likeCount={feedback.likes}
                dislikeCount={feedback.dislikes}
                userFeedback={feedback.userFeedback}
                outfit={outfit}
                showOutfitInfo
                products={outfitProducts[outfit.id] || []}
              />
            </div>
            <div className="w-full md:w-[500px] px-6 md:px-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl md:text-3xl font-bold text-black">#{index + 1}</span>
                  <div className="text-xs text-gray-500 font-light uppercase tracking-wider">
                    {outfit.gender} · {(outfit.body_type || '').replace(/_/g, ' ')} · {(outfit.vibe || '').replace(/_/g, ' ')}
                  </div>
                </div>
                <button
                  onClick={() => handleSave(outfit.id)}
                  className={`p-2 transition-all ${isSaved ? 'text-black' : 'text-gray-300 hover:text-gray-600'}`}
                  title={isSaved ? 'Remove from saved' : 'Save outfit'}
                >
                  <Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} />
                </button>
              </div>
              {totalPrice > 0 && (
                <div className="mb-2">
                  <span className="text-xs uppercase tracking-wider text-gray-500">Total Price</span>
                  <p className="text-lg font-semibold text-black">${totalPrice.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
