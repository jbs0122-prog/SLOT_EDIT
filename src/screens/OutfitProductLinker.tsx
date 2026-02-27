import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Outfit, Product, OutfitItem } from '../data/outfits';
import { supabase } from '../utils/supabase';
import { X, Plus, Trash2, Image as ImageIcon, Send, RefreshCw, Loader, Download, ArrowUpDown, CheckCircle2, AlertTriangle, Info, Sparkles, ChevronDown, ChevronUp, Zap, PackagePlus, Palette, Layers, Ruler, Search, Copy } from 'lucide-react';
import { reviseModelPhoto } from '../utils/modelPhotoGenerator';
import { downloadHighQualityImage } from '../utils/imageCompression';
import FlatlayRenderer from './FlatlayRenderer';
import {
  scoreProductForVibe,
  sortProductsByVibeCompat,
  analyzeOutfitCompleteness,
  COLOR_TIER_STYLES,
  COLOR_TIER_LABELS,
  type VibeCompatScore,
} from '../utils/vibeCompatibility';
import {
  getSlotRecommendations,
  type SlotRecommendations,
  type RegisteredRecommendation,
  type UnregisteredRecommendation,
  type ColorKeyword,
  type MaterialKeyword,
  type FitKeyword,
  COLOR_CHIP_MAP,
} from '../utils/slotRecommender';

interface OutfitProductLinkerProps {
  outfit: Outfit;
  onClose: () => void;
  onLinksUpdated: () => void;
}

const SLOT_TYPES = [
  { value: 'outer', label: '아우터' },
  { value: 'mid', label: '미드레이어' },
  { value: 'top', label: '상의' },
  { value: 'bottom', label: '하의' },
  { value: 'shoes', label: '신발' },
  { value: 'bag', label: '가방' },
  { value: 'accessory', label: '액세서리 1' },
  { value: 'accessory_2', label: '액세서리 2' },
];

const PRODUCT_CATEGORIES = [
  { value: 'outer', label: '아우터' },
  { value: 'mid', label: '미드레이어' },
  { value: 'top', label: '상의' },
  { value: 'bottom', label: '하의' },
  { value: 'shoes', label: '신발' },
  { value: 'bag', label: '가방' },
  { value: 'accessory', label: '액세서리' },
];

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-600 bg-emerald-50' : score >= 60 ? 'text-blue-600 bg-blue-50' : score >= 40 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${color}`}>{score}</span>;
}

interface SlotRecommendationPanelProps {
  slotValue: string;
  recommendations?: SlotRecommendations;
  expanded: boolean;
  onToggle: () => void;
  onQuickLink: (product: Product) => void;
  saving: boolean;
}

function SlotRecommendationPanel({ slotValue, recommendations, expanded, onToggle, onQuickLink, saving }: SlotRecommendationPanelProps) {
  const hasRegistered = recommendations && recommendations.registered.length > 0;
  const hasUnregistered = recommendations && recommendations.unregistered.length > 0;
  const hasAny = hasRegistered || hasUnregistered;

  if (!hasAny) {
    return (
      <div className="text-center py-4 text-gray-400 text-sm">
        <Plus size={24} className="mx-auto mb-1 opacity-50" />
        제품을 드래그하여 연결
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between py-2 px-2.5 rounded-lg text-sm transition-colors ${
          expanded
            ? 'bg-blue-50 border border-blue-200'
            : 'bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-100 hover:border-blue-300'
        }`}
      >
        <div className="flex items-center gap-2 text-blue-700">
          <Sparkles size={13} className="text-blue-500" />
          <span className="font-semibold text-xs">AI 추천 아이템</span>
          <div className="flex items-center gap-1">
            {hasRegistered && (
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                등록 {recommendations!.registered.length}
              </span>
            )}
            {hasUnregistered && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                미등록 {recommendations!.unregistered.length}
              </span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={13} className="text-blue-400" /> : <ChevronDown size={13} className="text-blue-400" />}
      </button>

      {expanded && (
        <div className="mt-1 space-y-3">
          {hasRegistered && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Zap size={12} className="text-emerald-500" />
                <span className="text-[11px] font-semibold text-gray-700">등록된 추천 아이템</span>
              </div>
              <div className="space-y-1.5">
                {recommendations!.registered.map(rec => (
                  <RegisteredRecCard
                    key={rec.product.id}
                    rec={rec}
                    onQuickLink={() => onQuickLink(rec.product)}
                    saving={saving}
                  />
                ))}
              </div>
            </div>
          )}

          {hasUnregistered && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <PackagePlus size={12} className="text-amber-500" />
                <span className="text-[11px] font-semibold text-gray-700">미등록 추천 아이템</span>
              </div>
              <div className="space-y-1.5">
                {recommendations!.unregistered.map((rec, idx) => (
                  <UnregisteredRecCard key={idx} rec={rec} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RegisteredRecCard({ rec, onQuickLink, saving }: { rec: RegisteredRecommendation; onQuickLink: () => void; saving: boolean }) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-2 hover:border-blue-300 hover:shadow-sm transition-all group/card">
      <img
        src={rec.product.image_url}
        alt={rec.product.name}
        className="w-11 h-11 object-cover rounded shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-gray-900 truncate">{rec.product.brand}</p>
        <p className="text-[10px] text-gray-500 truncate">{rec.product.name}</p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <ScoreBadge score={rec.score} />
          {rec.vibeScore.colorTier !== 'outside' && (
            <span className={`text-[8px] px-1 py-0.5 rounded border ${COLOR_TIER_STYLES[rec.vibeScore.colorTier]}`}>
              {COLOR_TIER_LABELS[rec.vibeScore.colorTier]}
            </span>
          )}
          {rec.reasons.slice(0, 2).map((r, i) => (
            <span key={i} className="text-[8px] px-1 py-0.5 bg-gray-100 text-gray-500 rounded">{r}</span>
          ))}
        </div>
      </div>
      <button
        onClick={onQuickLink}
        disabled={saving}
        className="shrink-0 p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50 opacity-0 group-hover/card:opacity-100"
        title="바로 연결"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

const TONAL_LABEL: Record<string, string> = {
  'tone-on-tone': '톤온톤',
  'tone-in-tone': '톤인톤',
  'contrast': '대비',
  'warm tone-on-tone': '웜 톤온톤',
  'cool tone-on-tone': '쿨 톤온톤',
};

const MATERIAL_REASON_LABEL: Record<MaterialKeyword['reason'], { label: string; className: string }> = {
  vibe_preferred: { label: 'Vibe', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  slot_fit: { label: '슬롯 적합', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  harmony_with_existing: { label: '기존 조화', className: 'bg-gray-50 text-gray-600 border-gray-200' },
  texture_contrast: { label: '텍스처 대비', className: 'bg-orange-50 text-orange-700 border-orange-200' },
};

const COLOR_TIER_CHIP: Record<ColorKeyword['tier'], string> = {
  primary: 'ring-2 ring-amber-400',
  secondary: 'ring-1 ring-blue-300',
  accent: 'ring-1 ring-gray-300',
};

function UnregisteredRecCard({ rec }: { rec: UnregisteredRecommendation }) {
  const [copied, setCopied] = useState(false);
  const affinityPct = Math.round(rec.vibeAffinity * 100);
  const affinityColor = affinityPct >= 80
    ? 'text-emerald-700 bg-emerald-50 border-emerald-300'
    : affinityPct >= 60
    ? 'text-blue-700 bg-blue-50 border-blue-200'
    : 'text-gray-500 bg-gray-50 border-gray-200';

  const handleCopyKeyword = () => {
    navigator.clipboard.writeText(rec.searchKeyword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 flex items-center justify-between gap-2 border-b border-amber-100">
        <p className="text-[11px] font-bold text-gray-800 capitalize leading-tight flex-1 min-w-0 truncate">{rec.itemName}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] text-gray-400">{rec.lookName}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${affinityColor}`}>
            {affinityPct}%
          </span>
        </div>
      </div>

      <div className="p-3 space-y-2.5">
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <Palette size={10} className="text-amber-500" />
            <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">색상 키워드</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {rec.colorKeywords.slice(0, 5).map((ck, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 bg-white rounded-full border border-gray-200 ${COLOR_TIER_CHIP[ck.tier]}`}
                title={`${ck.harmonyLabel} (${ck.harmonyScore})`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLOR_CHIP_MAP[ck.color] || '#ccc' }}
                />
                <span className="text-[9px] text-gray-700 font-medium">{ck.color}</span>
                <span className={`text-[7px] font-semibold ${
                  ck.harmonyScore >= 80 ? 'text-emerald-600' :
                  ck.harmonyScore >= 65 ? 'text-blue-600' : 'text-gray-400'
                }`}>{ck.harmonyScore}</span>
              </span>
            ))}
            {rec.colorHarmonyNote && (
              <span className="text-[8px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 font-medium self-center">
                {rec.colorHarmonyNote}
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <Layers size={10} className="text-blue-500" />
            <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">소재 키워드</span>
            {rec.textureHint && (
              <span className="ml-auto text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                {rec.textureHint}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {rec.materialKeywords.slice(0, 5).map((mk, i) => {
              const style = MATERIAL_REASON_LABEL[mk.reason];
              return (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border font-medium ${style.className}`}
                  title={`${style.label} · 호환도 ${mk.compatScore}`}
                >
                  {mk.material}
                  <span className="opacity-50 text-[7px]">{mk.compatScore}</span>
                </span>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <Ruler size={10} className="text-sky-500" />
            <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">핏 키워드</span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {rec.fitKeywords.map((fk, i) => (
              <span
                key={i}
                className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${
                  fk.dnaMatch
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}
              >
                {fk.label}
                {fk.dnaMatch && <span className="ml-0.5 text-sky-400">✓</span>}
              </span>
            ))}
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ml-auto ${
              rec.formalityHint.level >= 6
                ? 'bg-slate-100 text-slate-700 border-slate-200'
                : rec.formalityHint.level >= 4
                ? 'bg-gray-50 text-gray-600 border-gray-200'
                : 'bg-stone-50 text-stone-600 border-stone-200'
            }`}>
              {rec.formalityHint.label}
            </span>
            {rec.tonalHint && (
              <span className="text-[8px] px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-full">
                {TONAL_LABEL[rec.tonalHint] || rec.tonalHint}
              </span>
            )}
          </div>
        </div>

        <div className="pt-1 border-t border-gray-100">
          <div className="flex items-center gap-1 mb-1">
            <Search size={10} className="text-gray-400" />
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">검색 키워드</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-200">
            <code className="text-[10px] text-gray-700 font-mono flex-1 min-w-0 truncate">{rec.searchKeyword}</code>
            <button
              onClick={handleCopyKeyword}
              className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors"
              title="키워드 복사"
            >
              {copied ? <CheckCircle2 size={11} className="text-emerald-500" /> : <Copy size={11} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OutfitProductLinker({ outfit, onClose, onLinksUpdated }: OutfitProductLinkerProps) {
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [linkedItems, setLinkedItems] = useState<OutfitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedProduct, setDraggedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showRenderer, setShowRenderer] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);
  const [modelRevisionText, setModelRevisionText] = useState('');
  const [modelRevising, setModelRevising] = useState(false);
  const [modelRevisionError, setModelRevisionError] = useState('');
  const [currentModelUrl, setCurrentModelUrl] = useState(outfit.image_url_on_model);
  const [currentCleanUrl, setCurrentCleanUrl] = useState(outfit.image_url_flatlay_clean || '');
  const [downloadingFlatlay, setDownloadingFlatlay] = useState(false);
  const [downloadingModel, setDownloadingModel] = useState(false);
  const [vibeSort, setVibeSort] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current !== null) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, []);

  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const container = scrollContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const edgeZone = 80;
    const y = e.clientY;
    stopAutoScroll();
    if (y < rect.top + edgeZone) {
      const intensity = 1 - (y - rect.top) / edgeZone;
      const speed = Math.max(4, intensity * 20);
      const scroll = () => { container.scrollTop -= speed; autoScrollRef.current = requestAnimationFrame(scroll); };
      autoScrollRef.current = requestAnimationFrame(scroll);
    } else if (y > rect.bottom - edgeZone) {
      const intensity = 1 - (rect.bottom - y) / edgeZone;
      const speed = Math.max(4, intensity * 20);
      const scroll = () => { container.scrollTop += speed; autoScrollRef.current = requestAnimationFrame(scroll); };
      autoScrollRef.current = requestAnimationFrame(scroll);
    }
  }, [stopAutoScroll]);

  useEffect(() => { loadData(); }, [outfit.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsResult, itemsResult] = await Promise.all([
        supabase.from('products').select('*').eq('gender', outfit.gender).order('created_at', { ascending: false }),
        supabase.from('outfit_items').select(`*, product:products(*)`).eq('outfit_id', outfit.id)
      ]);
      if (productsResult.error) throw productsResult.error;
      if (itemsResult.error) throw itemsResult.error;

      setAvailableProducts(productsResult.data?.map(p => ({
        id: p.id, brand: p.brand, name: p.name, category: p.category, gender: p.gender,
        body_type: p.body_type || [], vibe: p.vibe || [], color: p.color || '', season: p.season || [],
        silhouette: p.silhouette || '', image_url: p.image_url, product_link: p.product_link || '',
        affiliate_link: p.affiliate_link || '', price: p.price, stock_status: p.stock_status || 'in_stock',
        material: p.material || '', color_family: p.color_family || '', color_tone: p.color_tone || '',
        sub_category: p.sub_category || '', pattern: p.pattern || '', formality: p.formality, warmth: p.warmth,
        created_at: p.created_at, updated_at: p.updated_at,
      } as Product)) || []);

      setLinkedItems(itemsResult.data?.map((item: any) => ({
        id: item.id, outfit_id: item.outfit_id, product_id: item.product_id,
        slot_type: item.slot_type, created_at: item.created_at,
        product: item.product ? {
          id: item.product.id, brand: item.product.brand, name: item.product.name,
          category: item.product.category, gender: item.product.gender,
          body_type: item.product.body_type || [], vibe: item.product.vibe || [],
          color: item.product.color || '', season: item.product.season || [],
          silhouette: item.product.silhouette || '', image_url: item.product.image_url,
          product_link: item.product.product_link || '', affiliate_link: item.product.affiliate_link || '',
          price: item.product.price, stock_status: item.product.stock_status || 'in_stock',
          material: item.product.material || '', color_family: item.product.color_family || '',
          color_tone: item.product.color_tone || '', sub_category: item.product.sub_category || '',
          pattern: item.product.pattern || '', formality: item.product.formality, warmth: item.product.warmth,
          created_at: item.product.created_at, updated_at: item.product.updated_at,
        } : undefined
      })) || []);
    } catch (error) {
      console.error('Load error:', error);
      alert('데이터 로드 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (product: Product) => { setDraggedProduct(product); };
  const handleDragEnd = () => { setDraggedProduct(null); setDragOverSlot(null); stopAutoScroll(); };

  const handleDrop = async (slotType: string) => {
    if (!draggedProduct) return;
    setSaving(true);
    try {
      const existingItem = linkedItems.find(item => item.slot_type === slotType);
      if (existingItem) {
        await supabase.from('outfit_items').delete().eq('id', existingItem.id);
      }
      const { error } = await supabase.from('outfit_items').insert([{ outfit_id: outfit.id, product_id: draggedProduct.id, slot_type: slotType }]);
      if (error) throw error;
      await loadData();
      onLinksUpdated();
    } catch (error) {
      console.error('Link error:', error);
      alert('연결 실패: ' + (error as Error).message);
    } finally {
      setSaving(false);
      setDraggedProduct(null);
    }
  };

  const handleRemoveLink = async (itemId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('outfit_items').delete().eq('id', itemId);
      if (error) throw error;
      await loadData();
      onLinksUpdated();
    } catch (error) {
      console.error('Remove error:', error);
      alert('제거 실패: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const refreshOutfitImages = async () => {
    const { data } = await supabase.from('outfits').select('image_url_on_model, image_url_flatlay_clean').eq('id', outfit.id).maybeSingle();
    if (data) {
      setCurrentModelUrl(data.image_url_on_model || '');
      setCurrentCleanUrl(data.image_url_flatlay_clean || '');
    }
  };

  const handleModelRevision = async () => {
    if (!modelRevisionText.trim() || !currentModelUrl || !currentCleanUrl) return;
    setModelRevising(true);
    setModelRevisionError('');
    try {
      const newModelUrl = await reviseModelPhoto(outfit.id, currentCleanUrl, currentModelUrl, modelRevisionText.trim());
      setCurrentModelUrl(newModelUrl);
      setModelRevisionText('');
      onLinksUpdated();
    } catch (err) {
      console.error('Model revision error:', err);
      setModelRevisionError((err as Error).message);
    } finally {
      setModelRevising(false);
    }
  };

  const handleDownloadFlatlay = async () => {
    if (!outfit.image_url_flatlay) return;
    setDownloadingFlatlay(true);
    try { await downloadHighQualityImage(outfit.image_url_flatlay, `flatlay_${outfit.id}.png`, import.meta.env.VITE_SUPABASE_URL); } catch (err) { console.error('Download failed:', err); } finally { setDownloadingFlatlay(false); }
  };

  const handleDownloadModel = async () => {
    if (!currentModelUrl) return;
    setDownloadingModel(true);
    try { await downloadHighQualityImage(currentModelUrl, `model_${outfit.id}.png`, import.meta.env.VITE_SUPABASE_URL); } catch (err) { console.error('Download failed:', err); } finally { setDownloadingModel(false); }
  };

  const getSlotItem = (slotType: string): OutfitItem | undefined => linkedItems.find(item => item.slot_type === slotType);

  // #12: Vibe-aware product sorting
  const filteredProducts = useMemo(() => {
    let products = availableProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    if (vibeSort && outfit.vibe) {
      return sortProductsByVibeCompat(products, outfit.vibe);
    }
    return products.map(p => ({ ...p, _vibeScore: scoreProductForVibe(p, outfit.vibe || '') }));
  }, [availableProducts, searchTerm, selectedCategory, vibeSort, outfit.vibe]);

  // #13: Drag compatibility preview score
  const dragPreviewScore = useMemo<VibeCompatScore | null>(() => {
    if (!draggedProduct || !outfit.vibe) return null;
    return scoreProductForVibe(draggedProduct, outfit.vibe);
  }, [draggedProduct, outfit.vibe]);

  // #14: Outfit completeness analysis
  const completeness = useMemo(() => {
    const itemsForAnalysis = linkedItems.map(item => ({
      slot_type: item.slot_type,
      product: item.product,
    }));
    return analyzeOutfitCompleteness(itemsForAnalysis, outfit.vibe || '');
  }, [linkedItems, outfit.vibe]);

  const slotRecommendationsMap = useMemo(() => {
    const map = new Map<string, SlotRecommendations>();
    const filledSlots = new Set(linkedItems.map(item => item.slot_type));
    const outfitSeason = outfit.season && outfit.season.length > 0 ? outfit.season[0] : undefined;

    for (const slot of SLOT_TYPES) {
      if (!filledSlots.has(slot.value)) {
        const recs = getSlotRecommendations(
          slot.value,
          availableProducts,
          linkedItems,
          outfit.vibe || '',
          outfit.gender,
          outfit.body_type,
          outfitSeason
        );
        map.set(slot.value, recs);
      }
    }
    return map;
  }, [availableProducts, linkedItems, outfit.vibe, outfit.gender, outfit.body_type, outfit.season]);

  const [expandedRecSlots, setExpandedRecSlots] = useState<Set<string>>(
    new Set(['outer', 'top', 'bottom', 'shoes'])
  );

  const toggleRecSlot = (slotValue: string) => {
    setExpandedRecSlots(prev => {
      const next = new Set(prev);
      if (next.has(slotValue)) next.delete(slotValue);
      else next.add(slotValue);
      return next;
    });
  };

  const handleQuickLink = async (slotType: string, product: Product) => {
    setSaving(true);
    try {
      const existingItem = linkedItems.find(item => item.slot_type === slotType);
      if (existingItem) {
        await supabase.from('outfit_items').delete().eq('id', existingItem.id);
      }
      const { error } = await supabase.from('outfit_items').insert([{ outfit_id: outfit.id, product_id: product.id, slot_type: slotType }]);
      if (error) throw error;
      await loadData();
      onLinksUpdated();
    } catch (error) {
      console.error('Quick link error:', error);
      alert('연결 실패: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-gray-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={scrollContainerRef}
        onDragOver={handleContainerDragOver}
        onDragLeave={stopAutoScroll}
        onDrop={stopAutoScroll}
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">코디 - 제품 연결</h2>
            <p className="text-sm text-gray-600 mt-1">제품을 슬롯으로 드래그하여 연결하세요</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>

        {/* #13: Drag compatibility preview */}
        {draggedProduct && dragPreviewScore && (
          <div className="sticky top-[73px] z-20 mx-6 mt-2 bg-gray-900 text-white rounded-lg px-4 py-2.5 flex items-center gap-4 shadow-xl">
            <span className="text-xs font-medium opacity-60">드래그 중:</span>
            <span className="text-sm font-semibold truncate max-w-[200px]">{draggedProduct.name}</span>
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] opacity-50">호환도</span>
                <span className={`text-sm font-bold ${dragPreviewScore.total >= 70 ? 'text-emerald-400' : dragPreviewScore.total >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                  {dragPreviewScore.total}
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded border ${
                dragPreviewScore.colorTier === 'primary' ? 'border-emerald-500 text-emerald-400' :
                dragPreviewScore.colorTier === 'secondary' ? 'border-blue-500 text-blue-400' :
                dragPreviewScore.colorTier === 'accent' ? 'border-amber-500 text-amber-400' :
                'border-red-500 text-red-400'
              }`}>
                {COLOR_TIER_LABELS[dragPreviewScore.colorTier]}
              </span>
            </div>
          </div>
        )}

        <div className="p-6">
          {/* #14: Outfit completeness panel */}
          <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {completeness.overallScore >= 70 ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : completeness.overallScore >= 40 ? (
                  <AlertTriangle size={18} className="text-amber-500" />
                ) : (
                  <Info size={18} className="text-gray-400" />
                )}
                <h3 className="text-sm font-semibold text-gray-900">코디 완성도</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      completeness.overallScore >= 70 ? 'bg-emerald-500' : completeness.overallScore >= 40 ? 'bg-amber-500' : 'bg-gray-400'
                    }`}
                    style={{ width: `${completeness.overallScore}%` }}
                  />
                </div>
                <span className={`text-sm font-bold ${
                  completeness.overallScore >= 70 ? 'text-emerald-600' : completeness.overallScore >= 40 ? 'text-amber-600' : 'text-gray-500'
                }`}>{completeness.overallScore}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">아이템</p>
                <p className="text-lg font-bold text-gray-900">{completeness.totalItems}<span className="text-xs text-gray-400">/8</span></p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">필수 슬롯</p>
                <p className={`text-lg font-bold ${completeness.hasCoreItems ? 'text-emerald-600' : 'text-red-500'}`}>
                  {completeness.hasCoreItems ? 'OK' : 'NEED'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">컬러 조화</p>
                <p className={`text-lg font-bold ${
                  completeness.colorHarmony === 'excellent' ? 'text-emerald-600' :
                  completeness.colorHarmony === 'good' ? 'text-blue-600' :
                  completeness.colorHarmony === 'fair' ? 'text-amber-600' : 'text-red-500'
                }`}>
                  {completeness.colorHarmony === 'excellent' ? 'A+' :
                   completeness.colorHarmony === 'good' ? 'A' :
                   completeness.colorHarmony === 'fair' ? 'B' : 'C'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">격식 편차</p>
                <p className={`text-lg font-bold ${completeness.formalitySpread <= 1 ? 'text-emerald-600' : completeness.formalitySpread <= 2 ? 'text-amber-600' : 'text-red-500'}`}>
                  {completeness.formalitySpread}
                </p>
              </div>
            </div>
            {completeness.missingSlots.length > 0 && completeness.missingSlots.length <= 5 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="text-[10px] text-gray-400">빈 슬롯:</span>
                {completeness.missingSlots.map(s => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded">
                    {SLOT_TYPES.find(st => st.value === s)?.label || s}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">코디 슬롯</h3>
              <div className="text-sm text-gray-500 mb-3">
                {outfit.gender} / {outfit.body_type} / {outfit.vibe}
              </div>

              <div className="space-y-3">
                {SLOT_TYPES.map(slot => {
                  const item = getSlotItem(slot.value);
                  const itemScore = item?.product ? scoreProductForVibe(item.product, outfit.vibe || '') : null;
                  return (
                    <div
                      key={slot.value}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (dragOverSlot !== slot.value) setDragOverSlot(slot.value); }}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverSlot(null); handleDrop(slot.value); }}
                      onDragEnter={(e) => { e.preventDefault(); setDragOverSlot(slot.value); }}
                      onDragLeave={(e) => { e.preventDefault(); if (dragOverSlot === slot.value) setDragOverSlot(null); }}
                      className={`border-2 border-dashed rounded-lg p-4 transition-all ${
                        dragOverSlot === slot.value ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{slot.label}</h4>
                          {itemScore && <ScoreBadge score={itemScore.total} />}
                          {itemScore && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${COLOR_TIER_STYLES[itemScore.colorTier]}`}>
                              {COLOR_TIER_LABELS[itemScore.colorTier]}
                            </span>
                          )}
                        </div>
                        {item && (
                          <button onClick={() => handleRemoveLink(item.id)} disabled={saving} className="text-red-600 hover:text-red-700 disabled:opacity-50">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      {item?.product ? (
                        <div className="flex items-start gap-3 bg-white rounded p-3">
                          <img src={item.product.image_url} alt={item.product.name} className="w-16 h-16 object-cover rounded" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{item.product.brand}</p>
                            <p className="text-xs text-gray-600 truncate">{item.product.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {item.product.price && <p className="text-xs text-gray-500">${item.product.price.toLocaleString()}</p>}
                              {item.product.color_family && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{item.product.color_family}</span>}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <SlotRecommendationPanel
                          slotValue={slot.value}
                          recommendations={slotRecommendationsMap.get(slot.value)}
                          expanded={expandedRecSlots.has(slot.value)}
                          onToggle={() => toggleRecSlot(slot.value)}
                          onQuickLink={(product) => handleQuickLink(slot.value, product)}
                          saving={saving}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {(outfit.image_url_flatlay || currentModelUrl) && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">생성된 이미지</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {outfit.image_url_flatlay && (
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs text-gray-500 font-medium">플랫레이</p>
                          <button onClick={handleDownloadFlatlay} disabled={downloadingFlatlay} title="고화질 PNG 다운로드" className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors disabled:opacity-50">
                            {downloadingFlatlay ? <Loader className="animate-spin" size={12} /> : <Download size={12} />}
                          </button>
                        </div>
                        <img src={outfit.image_url_flatlay} alt="Flatlay" className="w-full rounded object-contain" />
                      </div>
                    )}
                    {currentModelUrl && (
                      <div className="bg-gray-50 rounded-lg p-2 relative">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs text-gray-500 font-medium">모델컷</p>
                          <button onClick={handleDownloadModel} disabled={downloadingModel || modelRevising} title="고화질 PNG 다운로드" className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors disabled:opacity-50">
                            {downloadingModel ? <Loader className="animate-spin" size={12} /> : <Download size={12} />}
                          </button>
                        </div>
                        {modelRevising && (
                          <div className="absolute inset-0 bg-white bg-opacity-80 rounded-lg flex items-center justify-center z-10">
                            <div className="flex items-center gap-2 text-gray-700"><Loader className="animate-spin" size={18} /><span className="text-xs font-medium">수정 중...</span></div>
                          </div>
                        )}
                        <img src={currentModelUrl} alt="Model" className="w-full rounded object-contain" />
                      </div>
                    )}
                  </div>
                  {currentModelUrl && currentCleanUrl && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <RefreshCw size={14} className="text-gray-600" />
                        <h5 className="text-xs font-semibold text-gray-700">모델컷 AI 수정</h5>
                      </div>
                      <div className="flex gap-2">
                        <input type="text" value={modelRevisionText} onChange={(e) => setModelRevisionText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !modelRevising) handleModelRevision(); }} placeholder="예: 포즈를 바꿔줘, 코트를 열어줘..." disabled={modelRevising} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50" />
                        <button onClick={handleModelRevision} disabled={modelRevising || !modelRevisionText.trim()} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors">
                          {modelRevising ? <Loader className="animate-spin" size={14} /> : <Send size={14} />}
                          수정
                        </button>
                      </div>
                      {modelRevisionError && <p className="text-xs text-red-600 mt-1.5">{modelRevisionError}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">제품 목록</h3>
                {/* #12: Vibe sort toggle */}
                <button
                  onClick={() => setVibeSort(!vibeSort)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    vibeSort ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >
                  <ArrowUpDown size={13} />
                  {vibeSort ? 'Vibe 호환순' : '등록순'}
                </button>
              </div>

              <div className="mb-4 space-y-2">
                <input type="text" placeholder="제품명 또는 브랜드 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="all">전체 카테고리</option>
                  {PRODUCT_CATEGORIES.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
                </select>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">제품이 없습니다</div>
                ) : (
                  filteredProducts.map(product => {
                    const score = (product as any)._vibeScore as VibeCompatScore | undefined;
                    return (
                      <div
                        key={product.id}
                        draggable={true}
                        onDragStart={(e) => { handleDragStart(product); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', product.id); }}
                        onDragEnd={handleDragEnd}
                        className={`flex items-start gap-3 bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-blue-500 hover:shadow-md transition-all ${
                          draggedProduct?.id === product.id ? 'opacity-50 scale-95' : ''
                        }`}
                      >
                        <img src={product.image_url} alt={product.name} className="w-20 h-20 object-cover rounded" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm">{product.brand}</p>
                              <p className="text-xs text-gray-600 line-clamp-2">{product.name}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded whitespace-nowrap">
                                {PRODUCT_CATEGORIES.find(c => c.value === product.category)?.label}
                              </span>
                              {score && <ScoreBadge score={score.total} />}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            {product.price && <p className="text-sm font-semibold text-gray-900">${product.price.toLocaleString()}</p>}
                            {score && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border ${COLOR_TIER_STYLES[score.colorTier]}`}>
                                {COLOR_TIER_LABELS[score.colorTier]}
                              </span>
                            )}
                            {product.color_family && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{product.color_family}</span>}
                          </div>
                          {product.vibe && product.vibe.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {product.vibe.slice(0, 2).map((v, idx) => (
                                <span key={idx} className={`px-2 py-0.5 rounded text-xs ${v === outfit.vibe ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{v}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t flex justify-between items-center">
            <button onClick={() => setShowRenderer(true)} disabled={linkedItems.length === 0} className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
              <ImageIcon size={18} />
              플랫레이 렌더링
            </button>
            <button onClick={onClose} className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">완료</button>
          </div>
        </div>
      </div>

      {showRenderer && (
        <FlatlayRenderer outfitId={outfit.id} onClose={() => setShowRenderer(false)} onRendered={() => { setShowRenderer(false); refreshOutfitImages(); onLinksUpdated(); }} />
      )}
    </div>
  );
}
