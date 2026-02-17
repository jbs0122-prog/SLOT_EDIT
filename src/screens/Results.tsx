import { useState, useEffect, useRef, TouchEvent, useCallback } from 'react';
import { Bookmark, Share2, Check } from 'lucide-react';
import { Outfit, Product } from '../data/outfits';
import { WeatherData, getWeatherEmoji } from '../utils/weather';
import ImageSlider from './ImageSlider';
import { supabase } from '../utils/supabase';
import { useAuth } from '../utils/AuthContext';

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
  onRequestLogin: () => void;
  footer?: React.ReactNode;
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

export default function Results({ outfits, context, onBack, onGenerate, onRequestLogin, footer }: ResultsProps) {
  const { user } = useAuth();
  const { gender, bodyType, vibe, weather } = context;
  const [localOutfits, setLocalOutfits] = useState<Outfit[]>(outfits);
  const [feedbackCounts, setFeedbackCounts] = useState<FeedbackCounts>({});
  const [sortedOutfits, setSortedOutfits] = useState<Outfit[]>(outfits);
  const [sortOrder, setSortOrder] = useState<'likes' | 'latest'>('likes');
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [outfitProducts, setOutfitProducts] = useState<{ [outfitId: string]: Product[] }>({});
  const [savedOutfitIds, setSavedOutfitIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const firstOutfitRef = useRef<HTMLDivElement>(null);
  const outfitRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [copiedOutfitId, setCopiedOutfitId] = useState<string | null>(null);

  const [newGender, setNewGender] = useState<string>(gender);
  const [newBodyType, setNewBodyType] = useState<string>(bodyType);
  const [newVibe, setNewVibe] = useState<string>(vibe);
  const [isGenerating, setIsGenerating] = useState(false);

  const [outfitDescriptions, setOutfitDescriptions] = useState<{ [outfitId: string]: string }>({});
  const [openDropdown, setOpenDropdown] = useState<'gender' | 'bodyType' | 'vibe' | null>(null);
  const [currentGender, setCurrentGender] = useState<string>(gender);
  const [currentBodyType, setCurrentBodyType] = useState<string>(bodyType);
  const [currentVibe, setCurrentVibe] = useState<string>(vibe);

  const newGenderRef = useRef<HTMLDivElement>(null);
  const newBodyTypeRef = useRef<HTMLDivElement>(null);
  const newVibeRef = useRef<HTMLDivElement>(null);
  const wheelTimeoutRef = useRef<{ [key: string]: number }>({});

  const minSwipeDistance = 100;

  const handleShare = useCallback(async (outfitId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#results/look/${outfitId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check out this look', url });
        return;
      } catch { /* user cancelled or not supported */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedOutfitId(outfitId);
      setTimeout(() => setCopiedOutfitId(null), 2000);
    } catch { /* clipboard not available */ }
  }, []);

  useEffect(() => {
    setLocalOutfits(outfits);
  }, [outfits]);

  useEffect(() => {
    loadFeedbackCounts();
    loadOutfitProducts();
    refreshOutfitImages();
    if (containerRef.current) {
      const scrollableDiv = containerRef.current.querySelector('.overflow-y-auto');
      if (scrollableDiv) scrollableDiv.scrollTop = 0;
    }
  }, [outfits]);

  useEffect(() => {
    if (user) loadSavedOutfits();
  }, [user]);

  const collectPinProductIds = (outfitList: Outfit[]): Map<string, Set<string>> => {
    const map = new Map<string, Set<string>>();
    outfitList.forEach(o => {
      const ids = new Set<string>();
      (o.flatlay_pins || []).forEach(p => { if (p.product_id) ids.add(p.product_id); });
      (o.on_model_pins || []).forEach(p => { if (p.product_id) ids.add(p.product_id); });
      if (ids.size > 0) map.set(o.id, ids);
    });
    return map;
  };

  const mapProduct = (product: any): Product => ({
    id: product.id, brand: product.brand || '', name: product.name, category: product.category,
    gender: product.gender, body_type: product.body_type || [], vibe: product.vibe || [],
    color: product.color || '', season: product.season || [], silhouette: product.silhouette || '',
    image_url: product.image_url, product_link: product.product_link || '',
    affiliate_link: product.affiliate_link || '', price: product.price,
    stock_status: product.stock_status || 'in_stock',
    material: product.material || '', color_family: product.color_family || '',
    color_tone: product.color_tone || '', sub_category: product.sub_category || '',
    pattern: product.pattern || '',
    formality: typeof product.formality === 'number' ? product.formality : undefined,
    warmth: typeof product.warmth === 'number' ? product.warmth : undefined,
    nobg_image_url: product.nobg_image_url || '',
    created_at: product.created_at, updated_at: product.updated_at,
  });

  const refreshOutfitImages = async () => {
    const outfitIds = localOutfits.map(o => o.id);
    if (outfitIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('outfits')
        .select('id, image_url_flatlay, image_url_on_model, flatlay_pins, on_model_pins, "AI insight"')
        .in('id', outfitIds);

      if (error) throw error;
      if (!data) return;

      setLocalOutfits(prev =>
        prev.map(outfit => {
          const updated = data.find((d: any) => d.id === outfit.id);
          if (updated) {
            const aiInsight = (updated as any)['AI insight'];
            return {
              ...outfit,
              image_url_flatlay: updated.image_url_flatlay || outfit.image_url_flatlay,
              image_url_on_model: updated.image_url_on_model || outfit.image_url_on_model,
              flatlay_pins: updated.flatlay_pins || outfit.flatlay_pins,
              on_model_pins: updated.on_model_pins || outfit.on_model_pins,
              ...(aiInsight ? { insight_text: aiInsight } : {}),
            };
          }
          return outfit;
        })
      );
    } catch (error) {
      console.error('Failed to refresh outfit images:', error);
    }
  };

  const loadOutfitProducts = async () => {
    const outfitIds = localOutfits.map(o => o.id);
    if (outfitIds.length === 0) return;

    try {
      const { data: outfitItemsData, error: itemsError } = await supabase
        .from('outfit_items').select('outfit_id, product_id').in('outfit_id', outfitIds);
      if (itemsError) throw itemsError;

      const pinProductMap = collectPinProductIds(localOutfits);
      const allProductIds = new Set<string>();
      outfitItemsData?.forEach(item => allProductIds.add(item.product_id));
      pinProductMap.forEach(ids => ids.forEach(id => allProductIds.add(id)));
      if (allProductIds.size === 0) return;

      const { data: productsData, error: productsError } = await supabase
        .from('products').select('*').in('id', [...allProductIds]);
      if (productsError) throw productsError;

      const productMap: { [outfitId: string]: Product[] } = {};
      outfitItemsData?.forEach(item => {
        const product = productsData?.find(p => p.id === item.product_id);
        if (product) {
          if (!productMap[item.outfit_id]) productMap[item.outfit_id] = [];
          productMap[item.outfit_id].push(mapProduct(product));
        }
      });

      pinProductMap.forEach((ids, outfitId) => {
        if (!productMap[outfitId]) productMap[outfitId] = [];
        const existing = new Set(productMap[outfitId].map(p => p.id));
        ids.forEach(pid => {
          if (!existing.has(pid)) {
            const product = productsData?.find(p => p.id === pid);
            if (product) productMap[outfitId].push(mapProduct(product));
          }
        });
      });

      setOutfitProducts(productMap);
    } catch (error) {
      console.error('Failed to load outfit products:', error);
    }
  };

  const generateOutfitDescription = (products: Product[], outfit: Outfit): string => {
    if (products.length === 0) return '';
    const slotOrder: Record<string, number> = { outer: 0, mid: 1, top: 2, bottom: 3, shoes: 4, bag: 5, accessory: 6 };
    const sorted = [...products].sort((a, b) => (slotOrder[a.category] ?? 99) - (slotOrder[b.category] ?? 99));
    const brandSet = new Set(sorted.map(p => p.brand).filter(Boolean));
    const brands = Array.from(brandSet);
    const vibeLabel = (outfit.vibe || '').replace(/_/g, ' ').toLowerCase();
    const itemDescriptions = sorted.map(p => `${p.brand ? p.brand + ' ' : ''}${p.name}`);

    let desc = vibeLabel ? `A ${vibeLabel} look` : 'A curated look';
    if (brands.length > 0) {
      desc += ` featuring ${brands.length <= 2 ? brands.join(' and ') : `${brands.slice(0, 2).join(', ')} and more`}`;
    }
    desc += '. ';
    if (itemDescriptions.length <= 3) {
      desc += `Styled with ${itemDescriptions.join(', ')}.`;
    } else {
      desc += `Styled with ${itemDescriptions.slice(0, 3).join(', ')}, and ${itemDescriptions.length - 3} more piece${itemDescriptions.length - 3 > 1 ? 's' : ''}.`;
    }
    return desc;
  };

  useEffect(() => {
    const descriptions: { [id: string]: string } = {};
    localOutfits.forEach(outfit => {
      const products = outfitProducts[outfit.id] || [];
      if (products.length > 0) descriptions[outfit.id] = generateOutfitDescription(products, outfit);
    });
    setOutfitDescriptions(descriptions);
  }, [outfitProducts, localOutfits]);

  const getOutfitTotalPrice = (outfitId: string): number => {
    return (outfitProducts[outfitId] || []).reduce((sum, p) => sum + (p.price || 0), 0);
  };

  useEffect(() => {
    const sorted = [...localOutfits].sort((a, b) => {
      if (sortOrder === 'likes') {
        return (feedbackCounts[b.id]?.likes || 0) - (feedbackCounts[a.id]?.likes || 0);
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
    setSortedOutfits(sorted);
  }, [localOutfits, feedbackCounts, sortOrder]);

  useEffect(() => {
    if (sortedOutfits.length === 0) return;
    const hash = window.location.hash.replace('#', '');
    const match = hash.match(/^results\/look\/(.+)$/);
    if (!match) return;
    const targetId = match[1];
    const exists = sortedOutfits.some(o => o.id === targetId);
    if (!exists) return;

    const timer = setTimeout(() => {
      const el = outfitRefs.current.get(targetId);
      if (el) {
        const scrollContainer = containerRef.current?.querySelector('.overflow-y-auto');
        if (scrollContainer) {
          const containerTop = scrollContainer.getBoundingClientRect().top;
          const elTop = el.getBoundingClientRect().top;
          scrollContainer.scrollTo({ top: scrollContainer.scrollTop + (elTop - containerTop) - 20, behavior: 'smooth' });
        } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [sortedOutfits]);

  const loadFeedbackCounts = async () => {
    const sessionId = getOrCreateSessionId();
    const outfitIds = localOutfits.map(o => o.id);
    try {
      const { data, error } = await supabase
        .from('outfit_feedback').select('outfit_id, feedback_type, session_id').in('outfit_id', outfitIds);
      if (error) throw error;

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
    } catch (error) {
      console.error('Failed to load feedback counts:', error);
    }
  };

  const handleFeedback = async (outfitId: string, feedbackType: 'like' | 'dislike') => {
    const sessionId = getOrCreateSessionId();
    try {
      const current = feedbackCounts[outfitId]?.userFeedback;
      if (current === feedbackType) {
        await supabase.from('outfit_feedback').delete().eq('outfit_id', outfitId).eq('session_id', sessionId);
      } else {
        if (current) await supabase.from('outfit_feedback').delete().eq('outfit_id', outfitId).eq('session_id', sessionId);
        await supabase.from('outfit_feedback').insert({ outfit_id: outfitId, feedback_type: feedbackType, session_id: sessionId });
      }
      await loadFeedbackCounts();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const loadSavedOutfits = async () => {
    if (!user) return;
    const { data } = await supabase.from('saved_outfits').select('outfit_id').eq('user_id', user.id);
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

  const handleTouchStart = (e: TouchEvent) => { setTouchEnd(0); setTouchStart(e.targetTouches[0].clientX); };
  const handleTouchMove = (e: TouchEvent) => { setTouchEnd(e.targetTouches[0].clientX); };
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    if (touchStart - touchEnd < -minSwipeDistance) onBack();
  };

  const handleWheel = (
    e: React.WheelEvent<HTMLDivElement>,
    ref: React.RefObject<HTMLDivElement>,
    options: string[],
    currentValue: string,
    setState: (value: string) => void,
    key: string
  ) => {
    if (window.innerWidth < 768) return;
    e.preventDefault();
    if (wheelTimeoutRef.current[key]) return;
    wheelTimeoutRef.current[key] = window.setTimeout(() => { delete wheelTimeoutRef.current[key]; }, 150);

    const currentIndex = options.indexOf(currentValue);
    let newIndex = currentIndex;
    if (e.deltaY > 0 && currentIndex < options.length - 1) newIndex++;
    else if (e.deltaY < 0 && currentIndex > 0) newIndex--;

    if (newIndex !== currentIndex) {
      setState(options[newIndex]);
      if (ref.current) {
        const items = Array.from(ref.current.querySelectorAll('[data-scroll-item]'));
        const target = items[newIndex] as HTMLElement;
        if (target) {
          ref.current.scrollTo({ top: target.offsetTop - ref.current.clientHeight / 2 + target.clientHeight / 2, behavior: 'smooth' });
        }
      }
    }
  };

  useEffect(() => {
    const setupScrollPicker = (ref: React.RefObject<HTMLDivElement>, options: string[], setState: (v: string) => void) => {
      const container = ref.current;
      if (!container) return;
      const items = container.querySelectorAll('[data-scroll-item]');
      if (items.length === 0) return;

      const updateSelection = () => {
        const rect = container.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        let closest: Element | null = null;
        let minDist = Infinity;
        items.forEach(item => {
          const ir = item.getBoundingClientRect();
          const d = Math.abs(center - (ir.top + ir.height / 2));
          if (d < minDist) { minDist = d; closest = item; }
        });
        if (closest) {
          const val = closest.getAttribute('data-value');
          if (val) setState(val);
        }
      };

      const first = items[0] as HTMLElement;
      container.scrollTop = first.offsetTop - container.clientHeight / 2 + first.clientHeight / 2;
      updateSelection();

      let timeout: number;
      const onScroll = () => { clearTimeout(timeout); timeout = window.setTimeout(updateSelection, 50); };
      container.addEventListener('scroll', onScroll);
      return () => { container.removeEventListener('scroll', onScroll); clearTimeout(timeout); };
    };

    const c1 = setupScrollPicker(newGenderRef, GENDER_OPTIONS, setNewGender);
    const c2 = setupScrollPicker(newBodyTypeRef, BODY_TYPE_OPTIONS, setNewBodyType);
    const c3 = setupScrollPicker(newVibeRef, VIBE_OPTIONS, setNewVibe);
    return () => { c1?.(); c2?.(); c3?.(); };
  }, []);

  const handleNewGenerate = () => {
    if (!weather) return;
    setIsGenerating(true);
    setTimeout(() => { setIsGenerating(false); onGenerate(newGender, newBodyType, newVibe, weather); }, 800);
  };

  const handleDropdownSelect = (type: 'gender' | 'bodyType' | 'vibe', value: string) => {
    if (!weather) return;
    setOpenDropdown(null);
    setIsGenerating(true);
    let g = currentGender, b = currentBodyType, v = currentVibe;
    if (type === 'gender') { g = value; setCurrentGender(value); }
    else if (type === 'bodyType') { b = value; setCurrentBodyType(value); }
    else { v = value; setCurrentVibe(value); }
    setTimeout(() => { setIsGenerating(false); onGenerate(g, b, v, weather); }, 800);
  };

  useEffect(() => { setCurrentGender(gender); setCurrentBodyType(bodyType); setCurrentVibe(vibe); }, [gender, bodyType, vibe]);

  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.relative')) setOpenDropdown(null); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openDropdown]);

  const scrollItemClick = (ref: React.RefObject<HTMLDivElement>, option: string) => {
    if (window.innerWidth >= 768 && ref.current) {
      const items = Array.from(ref.current.querySelectorAll('[data-scroll-item]'));
      const idx = items.findIndex(i => i.getAttribute('data-value') === option);
      if (idx !== -1) {
        const t = items[idx] as HTMLElement;
        ref.current.scrollTo({ top: t.offsetTop - ref.current.clientHeight / 2 + t.clientHeight / 2, behavior: 'smooth' });
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-screen flex flex-col bg-white relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isGenerating && (
        <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center">
          <div className="text-lg font-light tracking-wider uppercase animate-pulse">Finding your look...</div>
        </div>
      )}

      <header className="fixed top-0 left-0 right-0 bg-white z-40 border-b border-gray-200 md:hidden">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => window.location.hash = ''} className="focus:outline-none">
              <img src="/logo.png" alt="SLOT EDIT" className="h-12" />
            </button>
            {weather && (
              <div className="text-sm text-gray-700 font-medium">
                {getWeatherEmoji(weather.condition)} {weather.temperature}°F
              </div>
            )}
          </div>

          <div className="mb-2 relative">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 font-light">
              <div className="relative">
                <button onClick={() => setOpenDropdown(openDropdown === 'gender' ? null : 'gender')} className="hover:text-black transition-colors cursor-pointer uppercase">
                  {currentGender}
                </button>
                {openDropdown === 'gender' && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg z-50 min-w-[120px]">
                    {GENDER_OPTIONS.map(o => (
                      <button key={o} onClick={() => handleDropdownSelect('gender', o)}
                        className={`block w-full text-left px-4 py-2 text-xs uppercase hover:bg-gray-100 transition-colors ${o === currentGender ? 'font-medium bg-gray-50' : ''}`}>
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span>·</span>
              <div className="relative">
                <button onClick={() => setOpenDropdown(openDropdown === 'bodyType' ? null : 'bodyType')} className="hover:text-black transition-colors cursor-pointer uppercase">
                  {currentBodyType}
                </button>
                {openDropdown === 'bodyType' && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg z-50 min-w-[120px]">
                    {BODY_TYPE_OPTIONS.map(o => (
                      <button key={o} onClick={() => handleDropdownSelect('bodyType', o)}
                        className={`block w-full text-left px-4 py-2 text-xs uppercase hover:bg-gray-100 transition-colors ${o === currentBodyType ? 'font-medium bg-gray-50' : ''}`}>
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span>·</span>
              <div className="relative">
                <button onClick={() => setOpenDropdown(openDropdown === 'vibe' ? null : 'vibe')} className="hover:text-black transition-colors cursor-pointer uppercase">
                  {currentVibe}
                </button>
                {openDropdown === 'vibe' && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg z-50 min-w-[180px]">
                    {VIBE_OPTIONS.map(o => (
                      <button key={o} onClick={() => handleDropdownSelect('vibe', o)}
                        className={`block w-full text-left px-4 py-2 text-xs uppercase hover:bg-gray-100 transition-colors ${o === currentVibe ? 'font-medium bg-gray-50' : ''}`}>
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="ml-1 inline-flex items-center gap-1">
                <span className="text-[10px] text-gray-400">&larr;</span>
                <span className="inline-flex items-center border border-gray-300 rounded px-2 py-0.5">
                  <span className="text-[10px] tracking-wide uppercase animate-shimmer font-medium">Tap to remix</span>
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button onClick={() => setSortOrder('likes')}
              className={`font-light transition-colors uppercase ${sortOrder === 'likes' ? 'text-black font-medium' : 'text-gray-400 hover:text-gray-600'}`}>
              Most Liked
            </button>
            <span className="text-gray-300">/</span>
            <button onClick={() => setSortOrder('latest')}
              className={`font-light transition-colors uppercase ${sortOrder === 'latest' ? 'text-black font-medium' : 'text-gray-400 hover:text-gray-600'}`}>
              Latest
            </button>
          </div>
        </div>
      </header>

      <div className="hidden md:flex items-center justify-between px-8 py-5 border-b border-gray-100 sticky top-0 bg-white z-20">
        <div className="flex items-center gap-6">
          {weather && (
            <div className="text-sm text-gray-600 font-medium">
              {getWeatherEmoji(weather.condition)} {weather.temperature}°F · {weather.location}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600 font-light">
            <div className="relative">
              <button onClick={() => setOpenDropdown(openDropdown === 'gender' ? null : 'gender')} className="hover:text-black transition-colors cursor-pointer uppercase">
                {currentGender}
              </button>
              {openDropdown === 'gender' && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg z-50 min-w-[140px]">
                  {GENDER_OPTIONS.map(o => (
                    <button key={o} onClick={() => handleDropdownSelect('gender', o)}
                      className={`block w-full text-left px-4 py-2.5 text-sm uppercase hover:bg-gray-50 transition-colors ${o === currentGender ? 'font-medium bg-gray-50' : ''}`}>
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-gray-300">·</span>
            <div className="relative">
              <button onClick={() => setOpenDropdown(openDropdown === 'bodyType' ? null : 'bodyType')} className="hover:text-black transition-colors cursor-pointer uppercase">
                {currentBodyType}
              </button>
              {openDropdown === 'bodyType' && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg z-50 min-w-[140px]">
                  {BODY_TYPE_OPTIONS.map(o => (
                    <button key={o} onClick={() => handleDropdownSelect('bodyType', o)}
                      className={`block w-full text-left px-4 py-2.5 text-sm uppercase hover:bg-gray-50 transition-colors ${o === currentBodyType ? 'font-medium bg-gray-50' : ''}`}>
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-gray-300">·</span>
            <div className="relative">
              <button onClick={() => setOpenDropdown(openDropdown === 'vibe' ? null : 'vibe')} className="hover:text-black transition-colors cursor-pointer uppercase">
                {currentVibe}
              </button>
              {openDropdown === 'vibe' && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg z-50 min-w-[240px]">
                  {VIBE_OPTIONS.map(o => (
                    <button key={o} onClick={() => handleDropdownSelect('vibe', o)}
                      className={`block w-full text-left px-4 py-2.5 text-sm uppercase hover:bg-gray-50 transition-colors ${o === currentVibe ? 'font-medium bg-gray-50' : ''}`}>
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="ml-2 inline-flex items-center gap-1.5">
              <span className="text-xs text-gray-400">&larr;</span>
              <span className="inline-flex items-center border border-gray-300 rounded px-2.5 py-0.5">
                <span className="text-xs tracking-wide uppercase animate-shimmer font-medium">Tap to remix</span>
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => setSortOrder('likes')}
            className={`font-light transition-colors uppercase ${sortOrder === 'likes' ? 'text-black font-medium' : 'text-gray-400 hover:text-gray-600'}`}>
            Most Liked
          </button>
          <span className="text-gray-300">/</span>
          <button onClick={() => setSortOrder('latest')}
            className={`font-light transition-colors uppercase ${sortOrder === 'latest' ? 'text-black font-medium' : 'text-gray-400 hover:text-gray-600'}`}>
            Latest
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-[140px] md:pt-0 pb-20 md:pb-8">
        {sortedOutfits.length === 0 ? (
          <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
            <div className="px-6 text-center max-w-md mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-light mb-3">No Outfits Found</h2>
                <p className="text-gray-500 font-light text-sm leading-relaxed">
                  We don't have outfit recommendations for <span className="font-medium">{gender} · {bodyType} · {vibe}</span> yet.
                  Try a different combination or check back soon!
                </p>
              </div>
              <button onClick={onBack} className="px-6 py-3 text-sm tracking-wider font-light uppercase border border-black hover:bg-black hover:text-white transition-all">
                Try Again
              </button>
            </div>
          </div>
        ) : (
          sortedOutfits.map((outfit, index) => {
            const images = [];
            if (outfit.image_url_flatlay) images.push({ url: outfit.image_url_flatlay, label: 'Flatlay', tpo: outfit.tpo || '' });
            if (outfit.image_url_on_model) images.push({ url: outfit.image_url_on_model, label: 'On Model', tpo: outfit.tpo || '' });
            const feedback = feedbackCounts[outfit.id] || { likes: 0, dislikes: 0, userFeedback: null };
            const isSaved = savedOutfitIds.has(outfit.id);

            return (
              <div key={outfit.id}
                id={`look-${index + 1}`}
                ref={(el) => {
                  if (el) outfitRefs.current.set(outfit.id, el);
                  if (index === 0) (firstOutfitRef as any).current = el;
                }}
                className={`mb-12 flex flex-col md:flex-row md:items-start md:justify-center md:gap-8 md:px-12 ${index === 0 ? 'md:mt-8' : ''}`}>
                <div className="flex-shrink-0 w-full md:w-[500px] mb-6 md:mb-0">
                  <ImageSlider
                    images={images} alt={`Look ${index + 1}`} outfitNumber={index + 1} outfitId={outfit.id}
                    onFeedback={handleFeedback} likeCount={feedback.likes} dislikeCount={feedback.dislikes}
                    userFeedback={feedback.userFeedback} outfit={outfit} products={outfitProducts[outfit.id] || []}
                  />
                </div>
                <div className="w-full md:w-[500px] px-6 md:px-0 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs md:text-xl font-bold tracking-widest text-black uppercase">AI INSIGHT</div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => handleSave(outfit.id)}
                        className={`flex items-center gap-2 px-4 py-2 border text-xs md:text-sm tracking-wider uppercase transition-all ${
                          isSaved
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-black border-gray-300 hover:border-black'
                        }`}
                      >
                        <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
                        {isSaved ? 'Saved' : 'Save This Look'}
                      </button>
                      <button
                        onClick={() => handleShare(outfit.id)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-black transition-colors tracking-wider uppercase"
                      >
                        {copiedOutfitId === outfit.id ? (
                          <>
                            <Check size={12} />
                            <span>Link Copied</span>
                          </>
                        ) : (
                          <>
                            <Share2 size={12} />
                            <span>Share This Look</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  {getOutfitTotalPrice(outfit.id) > 0 && (
                    <div className="mb-3">
                      <span className="text-xs md:text-sm uppercase tracking-wider text-gray-500">Total Price</span>
                      <p className="text-lg md:text-2xl font-semibold text-black">${getOutfitTotalPrice(outfit.id).toFixed(2)}</p>
                    </div>
                  )}
                  <p className="text-sm md:text-base leading-relaxed font-light text-gray-800">
                    {(outfit.insight_text && !outfit.insight_text.startsWith('매칭 점수'))
                      ? outfit.insight_text
                      : outfitDescriptions[outfit.id] || outfit.insight_text}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {sortedOutfits.length > 0 && (
          <div className="mt-16 mb-8 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="w-full border-t border-gray-200 mb-12" />
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">COMING SOON</h2>
              <p className="text-sm md:text-base text-gray-600 font-light text-center mb-6">
                Your next curated flatlay is being styled.<br />
                We're preparing a new look — inspired by New York trends and your selected vibe.<br />
                Every combination is refined with fit, tone, and texture in mind.
              </p>

              <div className="mb-8">
                <h3 className="text-lg md:text-2xl font-bold text-center mb-6">Explore another slot</h3>
                <p className="text-sm md:text-base text-gray-600 font-light text-center mb-6">Discover fresh directions and new fashion moods.</p>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  {['Weather', 'Gender', 'Body Type', 'Vibe'].map(label => (
                    <div key={label} className="text-center">
                      <h4 className="text-xs md:text-base font-light tracking-widest text-gray-400 uppercase mb-3">{label}</h4>
                    </div>
                  ))}
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
                          <div className="text-xs md:text-base text-gray-500 mb-1">{weather.location}</div>
                          <div className="text-xl md:text-2xl font-semibold text-black mb-1">{weather.temperature}°F</div>
                          <div className="text-sm md:text-base text-gray-700">{getWeatherEmoji(weather.condition)} {weather.condition}</div>
                        </div>
                      ) : (
                        <div className="text-lg md:text-2xl text-gray-400">--°F</div>
                      )}
                    </div>
                  </div>

                  {[
                    { ref: newGenderRef, options: GENDER_OPTIONS, value: newGender, setter: setNewGender, key: 'newGender', size: 'text-lg md:text-2xl' },
                    { ref: newBodyTypeRef, options: BODY_TYPE_OPTIONS, value: newBodyType, setter: setNewBodyType, key: 'newBodyType', size: 'text-base md:text-xl' },
                    { ref: newVibeRef, options: VIBE_OPTIONS, value: newVibe, setter: setNewVibe, key: 'newVibe', size: 'text-sm md:text-base' },
                  ].map(({ ref, options, value, setter, key, size }) => (
                    <div key={key} className="relative">
                      <div className="absolute inset-0 pointer-events-none z-10">
                        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent" />
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 border-y border-gray-200" />
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
                      </div>
                      <div
                        ref={ref}
                        className="h-[200px] overflow-y-scroll scroll-smooth snap-y snap-mandatory scrollbar-hide"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                        onWheel={(e) => handleWheel(e, ref, options, value, setter, key)}
                      >
                        <div className="h-[76px]" />
                        {options.map(option => (
                          <div key={option} data-scroll-item data-value={option} className="h-12 snap-center flex items-center justify-center transition-all duration-200">
                            <button
                              onClick={() => { setter(option); scrollItemClick(ref, option); }}
                              className={`tracking-wider uppercase transition-all duration-200 text-center px-2 md:cursor-pointer ${
                                value === option ? `${size} font-bold text-black` : `text-xs md:text-sm font-normal text-gray-600`
                              }`}
                            >
                              {option}
                            </button>
                          </div>
                        ))}
                        <div className="h-[76px]" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleNewGenerate}
                disabled={!weather || isGenerating}
                className={`w-full py-5 px-8 text-base md:text-xl tracking-widest font-normal uppercase transition-all ${
                  weather && !isGenerating ? 'bg-black text-white hover:bg-gray-900 cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isGenerating ? 'Finding your look...' : 'Generate New Look'}
              </button>
            </div>
          </div>
        )}
        {footer}
      </div>
    </div>
  );
}
