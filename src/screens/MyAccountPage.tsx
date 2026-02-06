import { useState, useEffect } from 'react';
import { LogOut, Bookmark, Settings, ChevronRight } from 'lucide-react';
import { useAuth } from '../utils/AuthContext';
import { supabase } from '../utils/supabase';
import { Outfit, Product } from '../data/outfits';
import ImageSlider from './ImageSlider';

interface MyAccountPageProps {
  onRequestLogin: () => void;
  view: 'menu' | 'saved';
  onNavigate: (view: 'menu' | 'saved') => void;
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

export default function MyAccountPage({ onRequestLogin, view, onNavigate }: MyAccountPageProps) {
  const { user, signOut } = useAuth();
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>([]);
  const [outfitProducts, setOutfitProducts] = useState<{ [id: string]: Product[] }>({});
  const [feedbackCounts, setFeedbackCounts] = useState<FeedbackCounts>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSavedOutfits();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadSavedOutfits = async () => {
    if (!user) return;
    setLoading(true);

    const { data: savedData } = await supabase
      .from('saved_outfits')
      .select('outfit_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!savedData || savedData.length === 0) {
      setSavedOutfits([]);
      setLoading(false);
      return;
    }

    const outfitIds = savedData.map(s => s.outfit_id);

    const { data: outfitsData } = await supabase
      .from('outfits')
      .select('*')
      .in('id', outfitIds);

    if (!outfitsData) { setLoading(false); return; }

    const ordered = outfitIds
      .map(id => outfitsData.find(o => o.id === id))
      .filter(Boolean)
      .map(row => ({
        id: row.id,
        gender: row.gender,
        body_type: row.body_type,
        vibe: row.vibe,
        image_url_flatlay: row.image_url_flatlay || '',
        image_url_on_model: row.image_url_on_model || '',
        insight_text: row['AI insight'] || '',
        flatlay_pins: row.flatlay_pins || [],
        on_model_pins: row.on_model_pins || [],
        tpo: row.tpo || '',
        status: row.status || '',
        prompt_flatlay: row.prompt_flatlay || '',
        created_at: row.created_at || '',
        updated_at: row.updated_at || '',
        items: [],
      }));

    setSavedOutfits(ordered);
    await loadProducts(ordered);
    await loadFeedback(ordered.map(o => o.id));
    setLoading(false);
  };

  const loadProducts = async (outfitList: Outfit[]) => {
    const outfitIds = outfitList.map(o => o.id);

    const pinProductIds = new Set<string>();
    outfitList.forEach(o => {
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
    const mapP = (p: any): Product => ({
      id: p.id, brand: p.brand || '', name: p.name, category: p.category,
      gender: p.gender, body_type: p.body_type || [], vibe: p.vibe || [],
      color: p.color || '', season: p.season || [], silhouette: p.silhouette || '',
      image_url: p.image_url, product_link: p.product_link || '',
      affiliate_link: p.affiliate_link || '', price: p.price,
      stock_status: p.stock_status || 'in_stock', created_at: p.created_at, updated_at: p.updated_at,
    });

    itemsData?.forEach(item => {
      const p = products.find(pr => pr.id === item.product_id);
      if (p) {
        if (!map[item.outfit_id]) map[item.outfit_id] = [];
        map[item.outfit_id].push(mapP(p));
      }
    });

    outfitList.forEach(o => {
      const pins = [...(o.flatlay_pins || []), ...(o.on_model_pins || [])];
      if (!map[o.id]) map[o.id] = [];
      const existing = new Set(map[o.id].map(pp => pp.id));
      pins.forEach(pin => {
        if (pin.product_id && !existing.has(pin.product_id)) {
          const p = products.find(pr => pr.id === pin.product_id);
          if (p) map[o.id].push(mapP(p));
        }
      });
    });

    setOutfitProducts(map);
  };

  const loadFeedback = async (outfitIds: string[]) => {
    const sessionId = getOrCreateSessionId();

    const { data } = await supabase
      .from('outfit_feedback')
      .select('outfit_id, feedback_type, session_id')
      .in('outfit_id', outfitIds);

    if (!data) return;

    const counts: FeedbackCounts = {};
    outfitIds.forEach(id => {
      const items = data.filter(f => f.outfit_id === id);
      counts[id] = {
        likes: items.filter(f => f.feedback_type === 'like').length,
        dislikes: items.filter(f => f.feedback_type === 'dislike').length,
        userFeedback: items.find(f => f.session_id === sessionId)?.feedback_type as 'like' | 'dislike' | null ?? null,
      };
    });
    setFeedbackCounts(counts);
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
    await loadFeedback(savedOutfits.map(o => o.id));
  };

  const handleUnsave = async (outfitId: string) => {
    if (!user) return;
    await supabase.from('saved_outfits').delete().eq('user_id', user.id).eq('outfit_id', outfitId);
    setSavedOutfits(prev => prev.filter(o => o.id !== outfitId));
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
            <Settings size={24} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-light tracking-wider uppercase mb-3">My Account</h2>
          <p className="text-sm text-gray-500 font-light mb-6">
            Sign in to save outfits and manage your style preferences.
          </p>
          <button
            onClick={onRequestLogin}
            className="px-8 py-3 bg-black text-white text-sm tracking-wider uppercase hover:bg-gray-900 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (view === 'saved') {
    return (
      <div className="pb-20 md:pb-8">
        <div className="px-6 py-6 border-b border-gray-100 flex items-center gap-4">
          <button onClick={() => onNavigate('menu')} className="text-gray-500 hover:text-black transition-colors text-sm">
            Back
          </button>
          <h1 className="text-xl font-bold tracking-wider uppercase">Saved Outfits</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="animate-pulse font-light tracking-wider">Loading...</div>
          </div>
        ) : savedOutfits.length === 0 ? (
          <div className="flex items-center justify-center min-h-[40vh] px-6">
            <div className="text-center">
              <Bookmark size={32} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-light text-sm">No saved outfits yet.</p>
              <p className="text-gray-400 font-light text-xs mt-1">Tap the bookmark icon on any outfit to save it here.</p>
            </div>
          </div>
        ) : (
          savedOutfits.map((outfit, index) => {
            const images = [];
            if (outfit.image_url_flatlay) images.push({ url: outfit.image_url_flatlay, label: 'Flatlay', tpo: outfit.tpo });
            if (outfit.image_url_on_model) images.push({ url: outfit.image_url_on_model, label: 'On Model', tpo: outfit.tpo });
            const feedback = feedbackCounts[outfit.id] || { likes: 0, dislikes: 0, userFeedback: null };

            return (
              <div key={outfit.id} className="mb-10 flex flex-col md:flex-row md:items-start md:justify-center md:gap-8 md:px-12">
                <div className="flex-shrink-0 w-full md:w-[500px] mb-4 md:mb-0">
                  <ImageSlider
                    images={images}
                    alt={`Saved ${index + 1}`}
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
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-gray-500 font-light uppercase tracking-wider">
                      {outfit.gender} · {(outfit.body_type || '').replace(/_/g, ' ')} · {(outfit.vibe || '').replace(/_/g, ' ')}
                    </div>
                    <button
                      onClick={() => handleUnsave(outfit.id)}
                      className="text-black p-2 hover:text-red-500 transition-colors"
                      title="Remove from saved"
                    >
                      <Bookmark size={18} fill="currentColor" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-8">
      <div className="px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Profile"
              className="w-14 h-14 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-xl font-medium text-gray-600">
                {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="text-lg font-medium">{user.user_metadata?.full_name || 'User'}</p>
            <p className="text-sm text-gray-500 font-light">{user.email}</p>
          </div>
        </div>

        <div className="border-t border-gray-100">
          <button
            onClick={() => { onNavigate('saved'); loadSavedOutfits(); }}
            className="w-full flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors px-2"
          >
            <div className="flex items-center gap-3">
              <Bookmark size={18} className="text-gray-600" />
              <span className="text-sm tracking-wider">Saved Outfits</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{savedOutfits.length}</span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </button>

          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 py-4 px-2 text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm tracking-wider">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
