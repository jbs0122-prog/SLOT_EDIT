import { useState, useRef, useEffect } from 'react';
import {
  Zap, Play, CheckCircle2, XCircle, Loader2,
  ChevronDown, ChevronRight, Package, ShoppingBag, Shirt,
  Sparkles, Clock, RefreshCw, ExternalLink, Check, X,
  BarChart3, ThumbsUp, ThumbsDown, Server, Monitor,
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import MCPPipelineMode from './MCPPipelineMode';

type Gender = 'MALE' | 'FEMALE' | 'UNISEX';
type BodyType = 'slim' | 'regular' | 'plus-size';
type Vibe = 'ELEVATED_COOL' | 'EFFORTLESS_NATURAL' | 'ARTISTIC_MINIMAL' | 'RETRO_LUXE' | 'SPORT_MODERN' | 'CREATIVE_LAYERED';
type Season = 'spring' | 'summer' | 'fall' | 'winter';
type EventStatus = 'start' | 'progress' | 'success' | 'error' | 'skip';

interface PipelineEvent {
  step: string;
  status: EventStatus;
  message: string;
  timestamp: string;
}

interface OutfitCandidateItem {
  slot: string;
  productId: string;
  name: string;
  imageUrl: string;
  price?: number;
}

interface ScoreBreakdown {
  tonalHarmony: number;
  formalityCoherence: number;
  materialCompat: number;
  vibeMatch: number;
  seasonFit: number;
  colorDepth: number;
  patternBalance?: number;
  accessoryHarmony?: number;
}

interface OutfitCandidate {
  outfitId: string;
  items: OutfitCandidateItem[];
  matchScore?: number;
  scoreBreakdown?: ScoreBreakdown;
  lookKey?: string;
  lookLabel?: string;
}

interface PipelineResult {
  batchId: string;
  events: PipelineEvent[];
  productsRegistered: number;
  outfitsGenerated: number;
  outfitIds: string[];
  outfitCandidates?: OutfitCandidate[];
  success: boolean;
  error?: string;
}

interface RunHistory {
  batchId: string;
  timestamp: string;
  gender: string;
  vibe: string;
  season: string;
  productsRegistered: number;
  outfitsGenerated: number;
  success: boolean;
}

const VIBES: { key: Vibe; label: string; desc: string }[] = [
  { key: 'ELEVATED_COOL', label: 'Elevated Cool', desc: 'Sharp, minimal, city-noir' },
  { key: 'EFFORTLESS_NATURAL', label: 'Effortless Natural', desc: 'Organic, relaxed, japandi' },
  { key: 'ARTISTIC_MINIMAL', label: 'Artistic Minimal', desc: 'Avant-garde, gallery, deconstructed' },
  { key: 'RETRO_LUXE', label: 'Retro Luxe', desc: 'Heritage, cinematic, old-money' },
  { key: 'SPORT_MODERN', label: 'Sport Modern', desc: 'Technical, functional, city-sport' },
  { key: 'CREATIVE_LAYERED', label: 'Creative Layered', desc: 'Eclectic, layered, expressive' },
];

const STEP_META: Record<string, { icon: React.ReactNode; label: string }> = {
  keywords: { icon: <Sparkles className="w-4 h-4" />, label: 'Rule Keywords' },
  search:   { icon: <ShoppingBag className="w-4 h-4" />, label: 'Filtered Search' },
  register: { icon: <Package className="w-4 h-4" />, label: 'Analyze & Register' },
  nobg:     { icon: <Shirt className="w-4 h-4" />, label: 'Background Removal' },
  outfits:  { icon: <BarChart3 className="w-4 h-4" />, label: 'Match Engine' },
};

const STATUS_COLOR: Record<EventStatus, string> = {
  start: 'text-blue-400', progress: 'text-zinc-400',
  success: 'text-emerald-400', error: 'text-red-400', skip: 'text-zinc-500',
};

const STATUS_DOT: Record<EventStatus, string> = {
  start: 'bg-blue-400', progress: 'bg-zinc-500',
  success: 'bg-emerald-400', error: 'bg-red-500', skip: 'bg-zinc-600',
};

const PIPELINE_STEPS = ['keywords', 'search', 'register', 'nobg', 'outfits'];

const SLOT_LABEL: Record<string, string> = {
  top: '상의', bottom: '하의', shoes: '신발',
  bag: '가방', accessory: '액세서리', outer: '아우터', mid: '미드레이어',
};

const SEASON_SLOT_DISPLAY: Record<string, { required: string[]; optional: string[]; excluded: string[] }> = {
  spring: { required: ['top', 'bottom', 'shoes'], optional: ['mid'], excluded: [] },
  summer: { required: ['top', 'bottom', 'shoes'], optional: [], excluded: ['outer', 'mid'] },
  fall:   { required: ['top', 'bottom', 'shoes'], optional: ['mid'], excluded: [] },
  winter: { required: ['top', 'bottom', 'shoes', 'outer', 'mid'], optional: [], excluded: [] },
};

const SCORE_LABELS: Record<string, string> = {
  tonalHarmony: 'Tonal',
  formalityCoherence: 'Formal',
  materialCompat: 'Material',
  vibeMatch: 'Vibe',
  seasonFit: 'Season',
  colorDepth: 'Color',
  patternBalance: 'Pattern',
  accessoryHarmony: 'Acc.Harm',
  warmthFit: 'Warmth',
  proportionBalance: 'Proportion',
};

const PIPELINE_SESSION_KEY = 'auto_pipeline_session';
const PIPELINE_HISTORY_KEY = 'auto_pipeline_history';

function getStepPhase(events: PipelineEvent[]): Record<string, EventStatus | 'idle'> {
  const phases: Record<string, EventStatus | 'idle'> = {};
  for (const step of PIPELINE_STEPS) {
    const stepEvents = events.filter(e => e.step === step);
    if (stepEvents.length === 0) { phases[step] = 'idle'; continue; }
    const hasSuccess = stepEvents.some(e => e.status === 'success');
    const hasError = stepEvents.some(e => e.status === 'error');
    if (hasError && !hasSuccess) { phases[step] = 'error'; continue; }
    if (hasSuccess) { phases[step] = 'success'; continue; }
    phases[step] = stepEvents[stepEvents.length - 1].status;
  }
  return phases;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function makeEvent(step: string, status: EventStatus, message: string): PipelineEvent {
  return { step, status, message, timestamp: new Date().toISOString() };
}

function EventRow({ event }: { event: PipelineEvent }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="text-[10px] text-zinc-600 font-mono mt-0.5 shrink-0 w-20">{formatTime(event.timestamp)}</span>
      <span className={`mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full ${STATUS_DOT[event.status]}`} />
      <span className={`text-xs leading-relaxed ${STATUS_COLOR[event.status]}`}>{event.message}</span>
    </div>
  );
}

function StepIndicator({ step, phase }: { step: string; phase: EventStatus | 'idle' }) {
  const meta = STEP_META[step];
  const isIdle = phase === 'idle';
  const isRunning = phase === 'start' || phase === 'progress';
  const isSuccess = phase === 'success';
  const isError = phase === 'error';
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 transition-all duration-300">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
        ${isIdle ? 'border-zinc-700 text-zinc-600 bg-zinc-900' : ''}
        ${isRunning ? 'border-blue-500 text-blue-400 bg-blue-500/10 animate-pulse' : ''}
        ${isSuccess ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : ''}
        ${isError ? 'border-red-500 text-red-400 bg-red-500/10' : ''}`}>
        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : meta.icon}
      </div>
      <span className={`text-[10px] font-medium text-center leading-tight ${
        isIdle ? 'text-zinc-600' : isRunning ? 'text-blue-400' : isSuccess ? 'text-emerald-400' : 'text-red-400'
      }`}>{meta.label}</span>
    </div>
  );
}

function scoreColor(val: number): string {
  if (val >= 80) return 'bg-emerald-500';
  if (val >= 60) return 'bg-sky-500';
  if (val >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function OutfitCandidateCard({ candidate, index, selected, onToggle }: {
  candidate: OutfitCandidate; index: number; selected: boolean; onToggle: () => void;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const essentials = candidate.items.filter(i => ['top', 'bottom', 'shoes'].includes(i.slot));
  const optionals = candidate.items.filter(i => !['top', 'bottom', 'shoes'].includes(i.slot));
  const bd = candidate.scoreBreakdown;
  return (
    <div className={`relative rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
      selected ? 'border-emerald-500 bg-emerald-500/8 shadow-lg shadow-emerald-500/10' : 'border-white/10 bg-white/4 hover:border-white/20 hover:bg-white/6'
    }`}>
      <div onClick={onToggle} className="cursor-pointer">
        <div className={`absolute top-3 right-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          selected ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-white/30'
        }`}>
          {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-zinc-300">
              {candidate.lookKey ? `Look ${candidate.lookKey}` : `Outfit ${index + 1}`}
            </span>
            {candidate.lookLabel && (
              <span className="text-[10px] text-zinc-500 font-medium">{candidate.lookLabel}</span>
            )}
            {candidate.matchScore !== undefined && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                candidate.matchScore >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                candidate.matchScore >= 50 ? 'bg-sky-500/20 text-sky-400' :
                'bg-amber-500/20 text-amber-400'
              }`}>{candidate.matchScore}pt</span>
            )}
            {optionals.length > 0 && (
              <span className="text-[10px] text-zinc-500 bg-white/6 px-2 py-0.5 rounded-full">+{optionals.length}</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {essentials.map((item) => (
              <div key={item.slot} className="flex flex-col gap-1">
                <div className="aspect-square bg-zinc-800 rounded-lg overflow-hidden">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1"
                    onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100?text=No+Img'; }} />
                </div>
                <span className="text-[9px] text-zinc-500 text-center truncate">{SLOT_LABEL[item.slot] || item.slot}</span>
              </div>
            ))}
          </div>
          {optionals.length > 0 && (
            <div className="flex gap-1.5 mt-1">
              {optionals.map((item) => (
                <div key={item.slot} className="flex flex-col gap-0.5 flex-1">
                  <div className="aspect-square bg-zinc-800/60 rounded-md overflow-hidden">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1"
                      onError={(e) => { e.currentTarget.src = 'https://placehold.co/60x60?text=?'; }} />
                  </div>
                  <span className="text-[8px] text-zinc-600 text-center truncate">{SLOT_LABEL[item.slot] || item.slot}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {bd && (
        <div className="px-4 pb-3">
          <button onClick={(e) => { e.stopPropagation(); setShowBreakdown(!showBreakdown); }}
            className="w-full flex items-center justify-between py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
            <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />Score Detail</span>
            {showBreakdown ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          {showBreakdown && (
            <div className="mt-1.5 space-y-1.5">
              {Object.entries(bd).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[9px] text-zinc-500 w-12 shrink-0">{SCORE_LABELS[key] || key}</span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${scoreColor(val)}`} style={{ width: `${val}%` }} />
                  </div>
                  <span className="text-[9px] text-zinc-400 font-mono w-6 text-right">{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {candidate.items.some(i => i.price) && (
        <div className="px-4 pb-3 pt-1 border-t border-white/6">
          <span className="text-[10px] text-zinc-400">
            Total: <span className="text-white font-semibold">${candidate.items.reduce((sum, i) => sum + (i.price || 0), 0).toFixed(0)}</span>
          </span>
        </div>
      )}
    </div>
  );
}

interface PipelineSession {
  gender: Gender; bodyType: BodyType; vibe: Vibe; season: Season;
  outfitCount: number; productsPerSlot: number;
  result: PipelineResult | null; error: string | null;
  savedCount: number; selectedOutfitIds: string[];
}

interface SlotKeyword {
  keyword: string;
  slot: string;
}

function loadSession(): Partial<PipelineSession> {
  try { const raw = localStorage.getItem(PIPELINE_SESSION_KEY); if (raw) return JSON.parse(raw); } catch { /**/ }
  return {};
}

function saveSession(session: PipelineSession) {
  try { localStorage.setItem(PIPELINE_SESSION_KEY, JSON.stringify(session)); } catch { /**/ }
}

function parseHashParams(): Record<string, string> {
  const hash = window.location.hash.replace('#', '');
  const qIdx = hash.indexOf('?');
  if (qIdx < 0) return {};
  const params: Record<string, string> = {};
  const parts = hash.slice(qIdx + 1).split('&');
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return params;
}

export default function AdminAutoPipeline() {
  const session = loadSession();
  const hashParams = parseHashParams();

  const [mcpMode, setMcpMode] = useState(false);
  const [gender, setGender] = useState<Gender>((hashParams.gender as Gender) || session.gender || 'FEMALE');
  const [bodyType, setBodyType] = useState<BodyType>((hashParams.body_type as BodyType) || session.bodyType || 'regular');
  const [vibe, setVibe] = useState<Vibe>((hashParams.vibe as Vibe) || session.vibe || 'ELEVATED_COOL');
  const [season, setSeason] = useState<Season>((hashParams.season as Season) || session.season || 'winter');
  const outfitCount = 3;
  const [productsPerSlot, setProductsPerSlot] = useState(session.productsPerSlot ?? 3);

  const [running, setRunning] = useState(false);
  const [aborting, setAborting] = useState(false);
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [result, setResult] = useState<PipelineResult | null>(session.result ?? null);
  const [error, setError] = useState<string | null>(session.error ?? null);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<RunHistory[]>([]);
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<Set<string>>(new Set(session.selectedOutfitIds ?? []));
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(session.savedCount ?? 0);

  const logEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);
  const usedKeywordsRef = useRef<SlotKeyword[]>([]);
  const lookKeywordsMapRef = useRef<Record<string, SlotKeyword[]>>({});

  useEffect(() => {
    saveSession({ gender, bodyType, vibe, season, outfitCount: 3, productsPerSlot, result, error, savedCount, selectedOutfitIds: Array.from(selectedOutfitIds) });
  }, [gender, bodyType, vibe, season, productsPerSlot, result, error, savedCount, selectedOutfitIds]);

  useEffect(() => {
    const saved = localStorage.getItem(PIPELINE_HISTORY_KEY);
    if (saved) { try { setHistory(JSON.parse(saved)); } catch { /**/ } }
  }, []);

  useEffect(() => {
    if (result?.outfitCandidates && selectedOutfitIds.size === 0) {
      setSelectedOutfitIds(new Set(result.outfitCandidates.map(c => c.outfitId)));
    }
  }, [result]);

  useEffect(() => {
    if (logEndRef.current && showAllLogs) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [events, showAllLogs]);

  const addEvent = (ev: PipelineEvent) => setEvents(prev => [...prev, ev]);

  const toggleStep = (step: string) => setExpandedSteps(prev => { const n = new Set(prev); n.has(step) ? n.delete(step) : n.add(step); return n; });
  const toggleOutfit = (id: string) => setSelectedOutfitIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleSaveSelected = async () => {
    if (selectedOutfitIds.size === 0) return;
    setSaving(true);
    try {
      const selectedIds = Array.from(selectedOutfitIds);
      const rejectedIds = (result?.outfitIds || []).filter(id => !selectedOutfitIds.has(id));

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      let authHeader = `Bearer ${anonKey}`;
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession?.access_token) authHeader = `Bearer ${authSession.access_token}`;
      } catch { /**/ }
      const feedbackHeaders = { 'Authorization': authHeader, 'apikey': anonKey, 'Content-Type': 'application/json' };

      await Promise.all([
        supabase.from('outfits').update({ status: 'pending_render' }).in('id', selectedIds),
        rejectedIds.length > 0 ? supabase.from('outfits').delete().in('id', rejectedIds) : Promise.resolve(),
      ]);

      const candidates = result?.outfitCandidates || [];
      const feedbackPromises = candidates.map(c => {
        const lookKws = c.lookKey && lookKeywordsMapRef.current[c.lookKey]
          ? lookKeywordsMapRef.current[c.lookKey]
          : usedKeywordsRef.current;
        return fetch(`${supabaseUrl}/functions/v1/auto-pipeline`, {
          method: 'POST', headers: feedbackHeaders,
          body: JSON.stringify({
            action: 'submit-feedback',
            batchId: result?.batchId,
            outfitId: c.outfitId,
            accepted: selectedIds.includes(c.outfitId),
            vibe, season,
            matchScore: c.matchScore,
            keywordsUsed: lookKws,
          }),
        }).catch(() => {});
      });
      await Promise.allSettled(feedbackPromises);

      setSavedCount(selectedIds.length);
      setSelectedOutfitIds(new Set());
      setResult(prev => prev ? { ...prev, outfitCandidates: undefined } : prev);
      if (result) {
        const entry: RunHistory = { batchId: result.batchId, timestamp: new Date().toISOString(), gender, vibe, season, productsRegistered: result.productsRegistered, outfitsGenerated: selectedIds.length, success: true };
        setHistory(prev => { const next = [entry, ...prev].slice(0, 10); localStorage.setItem(PIPELINE_HISTORY_KEY, JSON.stringify(next)); return next; });
      }
    } catch (err) {
      alert('저장 실패: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleAbort = () => {
    abortRef.current = true;
    setAborting(true);
    addEvent(makeEvent('done', 'error', 'Pipeline aborted by user'));
  };

  const handleRun = async () => {
    setRunning(true);
    setAborting(false);
    setResult(null);
    setError(null);
    setEvents([]);
    setShowAllLogs(false);
    setSavedCount(0);
    setSelectedOutfitIds(new Set());
    abortRef.current = false;
    usedKeywordsRef.current = [];
    lookKeywordsMapRef.current = {};

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    let authHeader = `Bearer ${anonKey}`;
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession?.access_token) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        const token = refreshed.session?.access_token ?? authSession.access_token;
        authHeader = `Bearer ${token}`;
      }
    } catch { /**/ }

    const apiBase = `${supabaseUrl}/functions/v1`;
    const authHeaders = { 'Authorization': authHeader, 'apikey': anonKey, 'Content-Type': 'application/json' };

    const batchId = `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const allOutfitIds: string[] = [];
    const allOutfitCandidates: OutfitCandidate[] = [];
    let registeredCount = 0;

    try {
      // ── STEP 1: Generate keywords per look (rule-based, zero Gemini) ───────
      addEvent(makeEvent('keywords', 'start', 'Generating keywords per look via rule engine (zero tokens)...'));
      const kwRes = await fetch(`${apiBase}/auto-generate-keywords`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ gender, body_type: bodyType, vibe, season }),
      });
      if (!kwRes.ok) throw new Error(`Keyword generation failed (${kwRes.status})`);
      const kwData = await kwRes.json();
      const byLook: Record<string, Record<string, string[]>> = kwData.byLook || {};
      const lookNames: Record<string, string> = kwData.lookNames || {};
      const lookKeys = Object.keys(byLook);
      const totalKw = Object.values(kwData.categories || {}).reduce((a: number, b: any) => a + (b as string[]).length, 0);
      addEvent(makeEvent('keywords', 'success', `${totalKw} keywords across ${lookKeys.length} looks: ${lookKeys.map(k => lookNames[k] || k).join(', ')}`));

      const allSlotKeywords: SlotKeyword[] = [];
      for (const [, lookCats] of Object.entries(byLook)) {
        for (const [slot, kws] of Object.entries(lookCats as Record<string, string[]>)) {
          for (const kw of kws) {
            allSlotKeywords.push({ keyword: kw, slot });
          }
        }
      }
      usedKeywordsRef.current = allSlotKeywords;

      if (abortRef.current) throw new Error('Aborted by user');

      const CORE_SLOTS = ['top','bottom','shoes','outer'];
      const OPTIONAL_SLOTS = ['bag','accessory','mid'];
      const PRIORITY_SLOTS = [...CORE_SLOTS, ...OPTIONAL_SLOTS];

      const existingAsins = new Set<string>();
      const { data: existingProducts } = await supabase.from('products').select('product_link').not('product_link', 'is', null);
      if (existingProducts) {
        for (const row of existingProducts) {
          const match = (row.product_link || '').match(/\/dp\/([A-Z0-9]{10})/);
          if (match) existingAsins.add(match[1]);
        }
      }

      const globalSearchedKws = new Set<string>();
      const globalSearchCache = new Map<string, any[]>();
      const globalSeenAsinsForDedup = new Set<string>();
      const lookSlotCandidatesMap: Record<string, Record<string, any[]>> = {};

      const searchSlot = async (kw: string, fallbackRating?: number): Promise<{ results: any[]; rawCount: number; filteredCount: number }> => {
        if (globalSearchCache.has(kw)) return { results: globalSearchCache.get(kw)!, rawCount: -1, filteredCount: -1 };
        globalSearchedKws.add(kw);
        try {
          const payload: any = { query: kw, page: 1 };
          if (fallbackRating) payload.filter = { minRating: fallbackRating };
          const r = await fetch(`${apiBase}/auto-amazon-search`, {
            method: 'POST', headers: authHeaders,
            body: JSON.stringify(payload),
          });
          if (r.ok) {
            const d = await r.json();
            const results = d.results || [];
            globalSearchCache.set(kw, results);
            return { results, rawCount: d.total_raw ?? -1, filteredCount: d.total_filtered ?? -1 };
          }
        } catch { /**/ }
        return { results: [], rawCount: 0, filteredCount: 0 };
      };

      for (let lookIdx = 0; lookIdx < lookKeys.length; lookIdx++) {
        const lookKey = lookKeys[lookIdx];
        const lookLabel = lookNames[lookKey] || lookKey;
        const lookCategories = byLook[lookKey] || {};
        const lookBatchId = `${batchId}-${lookKey}`;

        if (abortRef.current) throw new Error('Aborted by user');

        addEvent(makeEvent('search', 'start', `[Look ${lookKey}: ${lookLabel}] Searching Amazon (rating>=4.0)...`));
        const slotCandidates: Record<string, any[]> = {};
        const lookSeenAsins = new Set<string>();
        for (const slot of PRIORITY_SLOTS) {
          const isCore = CORE_SLOTS.includes(slot);
          const isMandatory = ['top', 'bottom', 'shoes'].includes(slot);
          const slotLimit = isMandatory ? Math.max(2, productsPerSlot) : isCore ? productsPerSlot : Math.max(1, productsPerSlot - 1);
          const allKws = lookCategories[slot] || [];
          if (allKws.length === 0) continue;
          const candidates: any[] = [];

          for (const kw of allKws) {
            if (candidates.length >= slotLimit) break;
            const cached = globalSearchCache.has(kw);
            const { results, rawCount, filteredCount } = await searchSlot(kw);
            for (const item of results) {
              if (item.asin && !lookSeenAsins.has(item.asin) && candidates.length < slotLimit) {
                lookSeenAsins.add(item.asin);
                globalSeenAsinsForDedup.add(item.asin);
                candidates.push(item);
              }
            }
            if (!cached && rawCount >= 0) {
              addEvent(makeEvent('search', 'progress', `[${lookKey}/${slot}] "${kw}" → ${filteredCount}/${rawCount} passed`));
            }
          }

          if (isCore && candidates.length === 0) {
            addEvent(makeEvent('search', 'progress', `[${lookKey}/${slot}] Retrying with rating>=3.5...`));
            for (const kw of allKws.slice(0, 2)) {
              const fallbackKey = `${kw}__fb35`;
              const { results, rawCount, filteredCount } = await searchSlot(fallbackKey);
              if (results.length === 0) {
                try {
                  const r = await fetch(`${apiBase}/auto-amazon-search`, {
                    method: 'POST', headers: authHeaders,
                    body: JSON.stringify({ query: kw, page: 1, filter: { minRating: 3.5 } }),
                  });
                  if (r.ok) {
                    const d = await r.json();
                    const fbResults = d.results || [];
                    globalSearchCache.set(fallbackKey, fbResults);
                    for (const item of fbResults) {
                      if (item.asin && !lookSeenAsins.has(item.asin) && candidates.length < slotLimit) {
                        lookSeenAsins.add(item.asin);
                        globalSeenAsinsForDedup.add(item.asin);
                        candidates.push(item);
                      }
                    }
                    addEvent(makeEvent('search', 'progress', `[${lookKey}/${slot}] fallback: ${d.total_filtered ?? 0}/${d.total_raw ?? 0} @3.5`));
                  }
                } catch { /**/ }
              }
              if (candidates.length >= slotLimit) break;
            }
          }

          if (candidates.length > 0) slotCandidates[slot] = candidates;
        }

        lookSlotCandidatesMap[lookKey] = slotCandidates;

        const totalCandidates = Object.values(slotCandidates).reduce((a, b) => a + b.length, 0);
        const missingCore = CORE_SLOTS.filter(s => s !== 'outer' && !(slotCandidates[s]?.length));
        addEvent(makeEvent('search', 'progress', `[Look ${lookKey}] ${totalCandidates} candidates` + (missingCore.length ? ` (missing: ${missingCore.join(',')})` : '')));
      }

      for (const lookKey of lookKeys) {
        const slotCandidates = lookSlotCandidatesMap[lookKey];
        const missingCore = ['top', 'bottom', 'shoes'].filter(s => !(slotCandidates[s]?.length));
        if (missingCore.length > 0) {
          for (const slot of missingCore) {
            for (const otherLook of lookKeys) {
              if (otherLook === lookKey) continue;
              const otherCandidates = lookSlotCandidatesMap[otherLook]?.[slot];
              if (otherCandidates?.length) {
                slotCandidates[slot] = otherCandidates.slice(0, 2);
                addEvent(makeEvent('search', 'progress', `[Look ${lookKey}/${slot}] Borrowed ${slotCandidates[slot].length} from Look ${otherLook}`));
                break;
              }
            }
          }
        }
      }

      addEvent(makeEvent('search', 'success', `Search complete: ${globalSearchedKws.size} unique API calls across ${lookKeys.length} looks`));

      if (abortRef.current) throw new Error('Aborted by user');

      const lookKeywordsMap: Record<string, SlotKeyword[]> = {};
      for (const lookKey of lookKeys) {
        const lookCats = byLook[lookKey] || {};
        const kws: SlotKeyword[] = [];
        for (const [slot, kwList] of Object.entries(lookCats as Record<string, string[]>)) {
          for (const kw of kwList) kws.push({ keyword: kw, slot });
        }
        lookKeywordsMap[lookKey] = kws;
      }
      lookKeywordsMapRef.current = lookKeywordsMap;

      for (let lookIdx = 0; lookIdx < lookKeys.length; lookIdx++) {
        const lookKey = lookKeys[lookIdx];
        const lookLabel = lookNames[lookKey] || lookKey;
        const lookBatchId = `${batchId}-${lookKey}`;
        const slotCandidates = lookSlotCandidatesMap[lookKey];

        const hasCoreSlots = ['top', 'bottom'].every(s => slotCandidates[s]?.length);
        if (!hasCoreSlots) {
          addEvent(makeEvent('register', 'error', `[Look ${lookKey}] Missing core slots, skipping`));
          continue;
        }

        if (abortRef.current) throw new Error('Aborted by user');

        addEvent(makeEvent('register', 'start', `[Look ${lookKey}] Analyzing & registering products...`));
        let lookRegistered = 0;
        let lookFailed = 0;

        const registerProduct = async (product: any, slot: string, attempt: number): Promise<boolean> => {
          try {
            const r = await fetch(`${apiBase}/auto-pipeline`, {
              method: 'POST', headers: authHeaders,
              body: JSON.stringify({ action: 'register-product', product, gender, body_type: bodyType, vibe, season, batchId: lookBatchId, slotHint: slot }),
            });
            if (!r.ok) return false;
            const d = await r.json();
            if (d.success) {
              if (product.asin) existingAsins.add(product.asin);
              return true;
            }
            return false;
          } catch {
            return false;
          }
        };

        for (const slot of PRIORITY_SLOTS) {
          const candidates = slotCandidates[slot] || [];
          for (const product of candidates) {
            let success = await registerProduct(product, slot, 1);
            if (!success) {
              await new Promise(r => setTimeout(r, 800));
              success = await registerProduct(product, slot, 2);
            }
            if (success) {
              lookRegistered++;
              registeredCount++;
            } else {
              lookFailed++;
            }
          }
        }

        const failMsg = lookFailed > 0 ? ` (${lookFailed} failed, retried once each)` : '';
        addEvent(makeEvent('register', 'success', `[Look ${lookKey}] Registered ${lookRegistered} products${failMsg}`));

        if (abortRef.current) throw new Error('Aborted by user');

        addEvent(makeEvent('nobg', 'start', `[Look ${lookKey}] Extracting flatlays...`));
        const { data: productsForBg } = await supabase.from('products').select('id, image_url, category, sub_category').eq('batch_id', lookBatchId).is('nobg_image_url', null);
        if (productsForBg && productsForBg.length > 0) {
          const valid = productsForBg.filter(p => !!p.image_url);
          const PARALLEL = 2;
          let extractedCount = 0;
          for (let i = 0; i < valid.length; i += PARALLEL) {
            const batch = valid.slice(i, i + PARALLEL);
            const results = await Promise.allSettled(batch.map(async p => {
              const r = await fetch(`${apiBase}/auto-pipeline`, {
                method: 'POST', headers: authHeaders,
                body: JSON.stringify({ action: 'extract-nobg', productId: p.id, imageUrl: p.image_url, category: p.category || 'top', subCategory: p.sub_category || '' }),
              });
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              const d = await r.json();
              if (!d.success || !d.nobgUrl) throw new Error('no nobg url');
              return d;
            }));
            extractedCount += results.filter(r => r.status === 'fulfilled').length;
            await new Promise(r => setTimeout(r, 500));
          }
          addEvent(makeEvent('nobg', 'success', `[Look ${lookKey}] ${extractedCount}/${valid.length} extracted`));
        } else {
          addEvent(makeEvent('nobg', 'success', `[Look ${lookKey}] All products have flatlays`));
        }

      }

      if (registeredCount === 0) throw new Error('No products were successfully registered');
      if (abortRef.current) throw new Error('Aborted by user');

      const lookBatchIdsList = lookKeys.map(k => ({ lookKey: k, batchId: `${batchId}-${k}` }));
      addEvent(makeEvent('outfits', 'start', `Generating outfits for ${lookKeys.length} looks (look-isolated assembly)...`));
      const outfitRes = await fetch(`${apiBase}/auto-pipeline`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({
          action: 'generate-outfits',
          batchId: `${batchId}-${lookKeys[0]}`,
          lookBatchIds: lookBatchIdsList,
          gender, body_type: bodyType, vibe, season, outfit_count: lookKeys.length,
        }),
      });
      if (outfitRes.ok) {
        const outfitData = await outfitRes.json();
        if (!outfitData.error) {
          const candidates = (outfitData.outfitCandidates || []).map((c: any) => ({
            ...c,
            lookKey: c.lookKey || undefined,
            lookLabel: c.lookKey ? (lookNames[c.lookKey] || c.lookKey) : undefined,
          }));
          allOutfitIds.push(...(outfitData.outfitIds || []));
          allOutfitCandidates.push(...candidates);
          for (const c of candidates) {
            addEvent(makeEvent('outfits', 'success', `[Look ${c.lookKey || '?'}] Outfit generated (score: ${c.matchScore ?? '?'})`));
          }
        } else {
          addEvent(makeEvent('outfits', 'error', outfitData.error));
        }
      } else {
        let errMsg = `Outfit generation failed (${outfitRes.status})`;
        try {
          const errData = await outfitRes.json();
          if (errData.error) errMsg = errData.error;
        } catch { /**/ }
        addEvent(makeEvent('outfits', 'error', errMsg));
      }

      if (allOutfitIds.length === 0) throw new Error('Could not generate any outfits');

      const finalResult: PipelineResult = {
        batchId, events: [],
        productsRegistered: registeredCount,
        outfitsGenerated: allOutfitIds.length,
        outfitIds: allOutfitIds,
        outfitCandidates: allOutfitCandidates,
        success: true,
      };
      setResult(finalResult);

    } catch (err) {
      const msg = (err as Error).message;
      if (msg !== 'Aborted by user') {
        setError(msg);
        addEvent(makeEvent('done', 'error', `Pipeline failed: ${msg}`));
      }
    } finally {
      setRunning(false);
      setAborting(false);
    }
  };

  const allEvents = [...events, ...(result?.events || [])];
  const stepPhases = getStepPhase(allEvents);
  const groupedEvents = PIPELINE_STEPS.reduce<Record<string, PipelineEvent[]>>((acc, step) => {
    acc[step] = allEvents.filter(e => e.step === step);
    return acc;
  }, {});
  const hasCandidates = result?.outfitCandidates && result.outfitCandidates.length > 0;

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">

        <div className="mb-10">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Auto Pipeline</h1>
              <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/30">BETA</span>
            </div>
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setMcpMode(false)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${!mcpMode ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'}`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Classic
              </button>
              <button
                onClick={() => setMcpMode(true)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${mcpMode ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'}`}
              >
                <Server className="w-3.5 h-3.5" />
                MCP
              </button>
            </div>
          </div>
          <p className="text-zinc-400 text-sm ml-12">
            {mcpMode
              ? 'Server-side pipeline | Learning feedback loop | Template insights | Zero browser dependency'
              : 'Look A/B/C 격리 조합 | Vibe Score + Color Palette 필터 | Season Slot 규칙 | Warmth Budget'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* LEFT: Config Panel */}
          <div className="lg:col-span-2 space-y-5">

            <div className="bg-white/5 rounded-2xl p-5 border border-white/8">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">Gender</label>
              <div className="grid grid-cols-3 gap-2">
                {(['MALE', 'FEMALE', 'UNISEX'] as Gender[]).map(g => (
                  <button key={g} onClick={() => setGender(g)} className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${gender === g ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}>
                    {g === 'MALE' ? 'Male' : g === 'FEMALE' ? 'Female' : 'Unisex'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/8">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">Body Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['slim', 'regular', 'plus-size'] as BodyType[]).map(b => (
                  <button key={b} onClick={() => setBodyType(b)} className={`py-2.5 rounded-xl text-xs font-semibold transition-all capitalize ${bodyType === b ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}>{b}</button>
                ))}
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/8">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">Season</label>
              <div className="grid grid-cols-4 gap-2">
                {(['spring', 'summer', 'fall', 'winter'] as Season[]).map(s => (
                  <button key={s} onClick={() => setSeason(s)} className={`py-2.5 rounded-xl text-xs font-semibold transition-all capitalize ${season === s ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}>{s}</button>
                ))}
              </div>
              {(() => {
                const info = SEASON_SLOT_DISPLAY[season];
                if (!info) return null;
                return (
                  <div className="mt-3 px-3 py-2.5 bg-white/3 rounded-xl border border-white/6">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Slot Rules</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {info.required.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">{SLOT_LABEL[s] || s}</span>
                      ))}
                      {info.optional.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">{SLOT_LABEL[s] || s}</span>
                      ))}
                      {info.excluded.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 line-through">{SLOT_LABEL[s] || s}</span>
                      ))}
                    </div>
                    {season === 'winter' && (
                      <div className="mt-1.5 text-[9px] text-zinc-500">Mid x Top 호환성 체크 적용</div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/8">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">Vibe</label>
              <div className="space-y-2">
                {VIBES.map(v => (
                  <button key={v.key} onClick={() => setVibe(v.key)} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all border ${vibe === v.key ? 'border-white/30 bg-white/10' : 'border-transparent bg-white/3 hover:bg-white/7 hover:border-white/10'}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${vibe === v.key ? 'bg-white' : 'bg-zinc-600'}`} />
                    <div>
                      <div className="text-xs font-semibold text-white">{v.label}</div>
                      <div className="text-[10px] text-zinc-500">{v.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-5 border border-white/8 space-y-4">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Settings</label>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-white">Outfits per run</div>
                  <div className="text-[10px] text-zinc-500">3 looks per vibe (A/B/C), 1 outfit each</div>
                </div>
                <span className="text-sm font-bold text-white bg-white/10 px-3 py-1.5 rounded-lg">3</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-white">Products per slot</div>
                  <div className="text-[10px] text-zinc-500">Candidates per category per look</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setProductsPerSlot(c => Math.max(1, c - 1))} className="w-7 h-7 rounded-lg bg-white/10 text-white hover:bg-white/20 text-sm font-bold transition-all">−</button>
                  <span className="text-sm font-bold text-white w-4 text-center">{productsPerSlot}</span>
                  <button onClick={() => setProductsPerSlot(c => Math.min(5, c + 1))} className="w-7 h-7 rounded-lg bg-white/10 text-white hover:bg-white/20 text-sm font-bold transition-all">+</button>
                </div>
              </div>
            </div>

            {!mcpMode && (
              <button onClick={running ? handleAbort : handleRun} disabled={aborting} className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2.5 ${aborting ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed' : running ? 'bg-red-600/90 text-white hover:bg-red-500 active:scale-[0.98]' : 'bg-white text-black hover:bg-zinc-100 active:scale-[0.98] shadow-lg shadow-white/5'}`}>
                {aborting ? <><Loader2 className="w-4 h-4 animate-spin" />Stopping...</> : running ? <><X className="w-4 h-4" />Abort Pipeline</> : <><Play className="w-4 h-4" fill="currentColor" />Run Auto Pipeline</>}
              </button>
            )}
          </div>

          {/* RIGHT: Progress & Results */}
          <div className="lg:col-span-3 space-y-4">

            {mcpMode && (
              <MCPPipelineMode
                gender={gender}
                bodyType={bodyType}
                vibe={vibe}
                season={season}
                productsPerSlot={productsPerSlot}
              />
            )}

            {!mcpMode && (running || result || events.length > 0) && (
              <div className="bg-white/5 rounded-2xl p-5 border border-white/8">
                <div className="flex items-center gap-2 mb-5">
                  {running ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    : result?.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : <XCircle className="w-4 h-4 text-red-400" />}
                  <span className="text-xs font-semibold text-zinc-300">
                    {running ? 'Pipeline running...'
                      : result?.success ? `Done — ${result.productsRegistered} products registered`
                      : `Failed: ${error}`}
                  </span>
                </div>
                <div className="flex items-start gap-0">
                  {PIPELINE_STEPS.map((step, i) => (
                    <div key={step} className="flex items-center flex-1">
                      <StepIndicator step={step} phase={stepPhases[step] || 'idle'} />
                      {i < PIPELINE_STEPS.length - 1 && (
                        <div className={`h-0.5 flex-1 mx-1 mb-5 transition-all duration-500 ${
                          stepPhases[PIPELINE_STEPS[i + 1]] && stepPhases[PIPELINE_STEPS[i + 1]] !== 'idle' ? 'bg-emerald-500/50' : 'bg-zinc-700'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!mcpMode && hasCandidates && (
              <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      코디 후보 선택
                      {result!.outfitCandidates!.some(c => c.matchScore !== undefined) && (
                        <span className="text-[10px] font-normal text-zinc-500">
                          avg score: {Math.round(result!.outfitCandidates!.reduce((s, c) => s + (c.matchScore || 0), 0) / result!.outfitCandidates!.length)}pt
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      <ThumbsUp className="w-3 h-3 inline mr-1" />{selectedOutfitIds.size} accept
                      <span className="mx-1.5 text-zinc-600">|</span>
                      <ThumbsDown className="w-3 h-3 inline mr-1" />{result!.outfitCandidates!.length - selectedOutfitIds.size} reject
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedOutfitIds(new Set(result!.outfitCandidates!.map(c => c.outfitId)))} className="text-[11px] text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/8 transition-all">전체 선택</button>
                    <button onClick={() => setSelectedOutfitIds(new Set())} className="text-[11px] text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/8 transition-all">전체 해제</button>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {result!.outfitCandidates!.map((candidate, i) => (
                    <OutfitCandidateCard key={candidate.outfitId} candidate={candidate} index={i} selected={selectedOutfitIds.has(candidate.outfitId)} onToggle={() => toggleOutfit(candidate.outfitId)} />
                  ))}
                </div>
                <div className="px-4 pb-4 flex items-center gap-3">
                  <button onClick={handleSaveSelected} disabled={saving || selectedOutfitIds.size === 0} className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${selectedOutfitIds.size === 0 ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' : saving ? 'bg-emerald-600 text-white cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-400 active:scale-[0.98]'}`}>
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" />저장 + 피드백 전송 중...</> : <><ThumbsUp className="w-4 h-4" />{selectedOutfitIds.size}개 등록 + 피드백 전송</>}
                  </button>
                  <button onClick={() => { const rejected = result?.outfitIds || []; if (rejected.length > 0) supabase.from('outfits').delete().in('id', rejected); setResult(prev => prev ? { ...prev, outfitCandidates: undefined } : prev); }} className="px-4 py-3 rounded-xl font-medium text-sm text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all flex items-center gap-2">
                    <X className="w-4 h-4" />전체 취소
                  </button>
                </div>
              </div>
            )}

            {!mcpMode && savedCount > 0 && !hasCandidates && (
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="font-bold text-emerald-300">코디 등록 완료</div>
                    <div className="text-xs text-emerald-400/70 mt-0.5">{savedCount}개 코디가 등록되었습니다</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-white">{result?.productsRegistered ?? 0}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Products Registered</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-white">{savedCount}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Outfits Saved</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <a href="#admin-products" className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-medium text-white transition-all"><Package className="w-3.5 h-3.5" />View Products</a>
                  <a href="#admin-outfit-linker" className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-medium text-white transition-all"><ExternalLink className="w-3.5 h-3.5" />View Outfits</a>
                  <button onClick={handleRun} className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-medium text-white transition-all ml-auto"><RefreshCw className="w-3.5 h-3.5" />Run Again</button>
                </div>
              </div>
            )}

            {!mcpMode && (error || (result && !result.success)) && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-red-300 mb-1">Pipeline Failed</div>
                    <div className="text-xs text-red-400/80">{error || result?.error}</div>
                  </div>
                </div>
              </div>
            )}

            {!mcpMode && !running && events.length === 0 && !result && !error && (
              <div className="bg-white/3 border border-white/6 rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-1">
                  <Zap className="w-7 h-7 text-zinc-500" />
                </div>
                <div className="text-sm font-medium text-zinc-400">Ready to run</div>
                <div className="text-xs text-zinc-600 max-w-xs">Select gender, body type, vibe, and season, then hit Run Auto Pipeline to start the full automation.</div>
              </div>
            )}

            {!mcpMode && allEvents.length > 0 && (
              <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                <button onClick={() => setShowAllLogs(v => !v)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-all">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    Pipeline Logs
                    <span className="bg-white/10 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded-full">{allEvents.length} events</span>
                  </span>
                  {showAllLogs ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
                </button>
                {showAllLogs && (
                  <div className="border-t border-white/8">
                    {PIPELINE_STEPS.map(step => {
                      const stepEvents = groupedEvents[step] || [];
                      if (stepEvents.length === 0) return null;
                      const meta = STEP_META[step];
                      const phase = (stepPhases[step] || 'idle') as EventStatus;
                      const isExpanded = expandedSteps.has(step);
                      return (
                        <div key={step} className="border-b border-white/5 last:border-0">
                          <button onClick={() => toggleStep(step)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-all text-left">
                            <span className={STATUS_COLOR[phase] || 'text-zinc-400'}>{meta.icon}</span>
                            <span className="text-xs font-semibold text-zinc-300 flex-1">{meta.label}</span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${phase === 'success' ? 'bg-emerald-500/15 text-emerald-400' : phase === 'error' ? 'bg-red-500/15 text-red-400' : 'bg-zinc-700 text-zinc-400'}`}>{stepEvents.length} events</span>
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-600" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />}
                          </button>
                          {isExpanded && (
                            <div className="px-5 pb-3 space-y-0.5 bg-black/20">
                              {stepEvents.map((e, i) => <EventRow key={i} event={e} />)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={logEndRef} />
                  </div>
                )}
              </div>
            )}

            {!mcpMode && history.length > 0 && (
              <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/8">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Recent Runs</span>
                </div>
                <div className="divide-y divide-white/5">
                  {history.slice(0, 5).map((run, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${run.success ? 'bg-emerald-400' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white">{run.gender} · {run.vibe.replace(/_/g, ' ')} · {run.season}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{new Date(run.timestamp).toLocaleString('ko-KR')} · {run.productsRegistered} products · {run.outfitsGenerated} outfits</div>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-600 truncate max-w-[80px]">{run.batchId.split('-').slice(-1)[0]}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
