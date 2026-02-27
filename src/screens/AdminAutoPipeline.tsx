import { useState, useRef, useEffect } from 'react';
import {
  Zap, Play, CheckCircle2, XCircle, Loader2, AlertCircle,
  ChevronDown, ChevronRight, Package, ShoppingBag, Shirt,
  Sparkles, Clock, SkipForward, RefreshCw, ExternalLink,
} from 'lucide-react';
import { supabase } from '../utils/supabase';

type Gender = 'MALE' | 'FEMALE' | 'UNISEX';
type BodyType = 'slim' | 'regular' | 'plus-size';
type Vibe = 'ELEVATED_COOL' | 'EFFORTLESS_NATURAL' | 'ARTISTIC_MINIMAL' | 'RETRO_LUXE' | 'SPORT_MODERN' | 'CREATIVE_LAYERED';
type Season = 'spring' | 'summer' | 'fall' | 'winter';

type EventStatus = 'start' | 'progress' | 'success' | 'error' | 'skip';

interface PipelineEvent {
  step: string;
  status: EventStatus;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

interface PipelineResult {
  batchId: string;
  events: PipelineEvent[];
  productsRegistered: number;
  outfitsGenerated: number;
  outfitIds: string[];
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

const VIBES: { key: Vibe; label: string; desc: string; color: string }[] = [
  { key: 'ELEVATED_COOL', label: 'Elevated Cool', desc: 'Sharp, minimal, city-noir', color: 'bg-zinc-800 text-white border-zinc-600' },
  { key: 'EFFORTLESS_NATURAL', label: 'Effortless Natural', desc: 'Organic, relaxed, japandi', color: 'bg-stone-100 text-stone-800 border-stone-300' },
  { key: 'ARTISTIC_MINIMAL', label: 'Artistic Minimal', desc: 'Avant-garde, gallery, deconstructed', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  { key: 'RETRO_LUXE', label: 'Retro Luxe', desc: 'Heritage, cinematic, old-money', color: 'bg-amber-50 text-amber-900 border-amber-300' },
  { key: 'SPORT_MODERN', label: 'Sport Modern', desc: 'Technical, functional, city-sport', color: 'bg-sky-50 text-sky-900 border-sky-300' },
  { key: 'CREATIVE_LAYERED', label: 'Creative Layered', desc: 'Eclectic, layered, expressive', color: 'bg-rose-50 text-rose-900 border-rose-300' },
];

const STEP_META: Record<string, { icon: React.ReactNode; label: string }> = {
  init:     { icon: <Zap className="w-4 h-4" />,         label: 'Initialize' },
  keywords: { icon: <Sparkles className="w-4 h-4" />,    label: 'AI Keywords' },
  search:   { icon: <ShoppingBag className="w-4 h-4" />, label: 'Amazon Search' },
  register: { icon: <Package className="w-4 h-4" />,     label: 'Register Products' },
  nobg:     { icon: <Shirt className="w-4 h-4" />,       label: 'Background Removal' },
  outfits:  { icon: <Sparkles className="w-4 h-4" />,    label: 'Outfit Generation' },
  done:     { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Complete' },
};

const STATUS_COLOR: Record<EventStatus, string> = {
  start:    'text-blue-400',
  progress: 'text-zinc-400',
  success:  'text-emerald-400',
  error:    'text-red-400',
  skip:     'text-zinc-500',
};

const STATUS_DOT: Record<EventStatus, string> = {
  start:    'bg-blue-400',
  progress: 'bg-zinc-500',
  success:  'bg-emerald-400',
  error:    'bg-red-500',
  skip:     'bg-zinc-600',
};

const PIPELINE_STEPS = ['keywords', 'search', 'register', 'nobg', 'outfits'];

function getStepPhase(events: PipelineEvent[]): Record<string, EventStatus | 'idle'> {
  const phases: Record<string, EventStatus | 'idle'> = {};
  for (const step of PIPELINE_STEPS) {
    const stepEvents = events.filter(e => e.step === step);
    if (stepEvents.length === 0) { phases[step] = 'idle'; continue; }
    const last = stepEvents[stepEvents.length - 1];
    phases[step] = last.status;
  }
  return phases;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function EventRow({ event }: { event: PipelineEvent }) {
  return (
    <div className="flex items-start gap-3 py-1.5 group">
      <span className="text-[10px] text-zinc-600 font-mono mt-0.5 shrink-0 w-20">
        {formatTime(event.timestamp)}
      </span>
      <span className={`mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full ${STATUS_DOT[event.status]}`} />
      <span className={`text-xs leading-relaxed ${STATUS_COLOR[event.status]}`}>
        {event.message}
      </span>
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
    <div className={`flex flex-col items-center gap-1.5 flex-1 transition-all duration-300`}>
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
        ${isIdle ? 'border-zinc-700 text-zinc-600 bg-zinc-900' : ''}
        ${isRunning ? 'border-blue-500 text-blue-400 bg-blue-500/10 animate-pulse' : ''}
        ${isSuccess ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : ''}
        ${isError ? 'border-red-500 text-red-400 bg-red-500/10' : ''}
      `}>
        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : meta.icon}
      </div>
      <span className={`text-[10px] font-medium text-center leading-tight ${
        isIdle ? 'text-zinc-600' : isRunning ? 'text-blue-400' : isSuccess ? 'text-emerald-400' : 'text-red-400'
      }`}>
        {meta.label}
      </span>
    </div>
  );
}

export default function AdminAutoPipeline() {
  const [gender, setGender] = useState<Gender>('FEMALE');
  const [bodyType, setBodyType] = useState<BodyType>('regular');
  const [vibe, setVibe] = useState<Vibe>('EFFORTLESS_NATURAL');
  const [season, setSeason] = useState<Season>('spring');
  const [outfitCount, setOutfitCount] = useState(3);
  const [productsPerSlot, setProductsPerSlot] = useState(5);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<RunHistory[]>([]);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('auto_pipeline_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch { /* */ }
    }
  }, []);

  useEffect(() => {
    if (logEndRef.current && showAllLogs) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [result?.events, showAllLogs]);

  const toggleStep = (step: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      next.has(step) ? next.delete(step) : next.add(step);
      return next;
    });
  };

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    setShowAllLogs(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-pipeline`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gender,
          body_type: bodyType,
          vibe,
          season,
          outfit_count: outfitCount,
          products_per_slot: productsPerSlot,
        }),
      });

      const data: PipelineResult = await res.json();
      setResult(data);

      if (data.success) {
        const entry: RunHistory = {
          batchId: data.batchId,
          timestamp: new Date().toISOString(),
          gender,
          vibe,
          season,
          productsRegistered: data.productsRegistered,
          outfitsGenerated: data.outfitsGenerated,
          success: true,
        };
        setHistory(prev => {
          const next = [entry, ...prev].slice(0, 10);
          localStorage.setItem('auto_pipeline_history', JSON.stringify(next));
          return next;
        });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const stepPhases = result ? getStepPhase(result.events) : {};

  const groupedEvents = result
    ? PIPELINE_STEPS.reduce<Record<string, PipelineEvent[]>>((acc, step) => {
        acc[step] = result.events.filter(e => e.step === step);
        return acc;
      }, {})
    : {};

  const currentStep = running
    ? 'Analyzing...'
    : result
    ? result.success
      ? `Done — ${result.productsRegistered} products, ${result.outfitsGenerated} outfits`
      : `Failed: ${result.error || 'Unknown error'}`
    : null;

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Auto Pipeline</h1>
            <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/30">
              BETA
            </span>
          </div>
          <p className="text-zinc-400 text-sm ml-12">
            키워드 생성 → 아마존 서칭 → 제품 등록 → 누끼 제거 → 코디 생성까지 한 번에
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── LEFT: Config Panel ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Gender */}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/8">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">Gender</label>
              <div className="grid grid-cols-3 gap-2">
                {(['MALE', 'FEMALE', 'UNISEX'] as Gender[]).map(g => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      gender === g
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {g === 'MALE' ? 'Male' : g === 'FEMALE' ? 'Female' : 'Unisex'}
                  </button>
                ))}
              </div>
            </div>

            {/* Body Type */}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/8">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">Body Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['slim', 'regular', 'plus-size'] as BodyType[]).map(b => (
                  <button
                    key={b}
                    onClick={() => setBodyType(b)}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all capitalize ${
                      bodyType === b
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Season */}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/8">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">Season</label>
              <div className="grid grid-cols-4 gap-2">
                {(['spring', 'summer', 'fall', 'winter'] as Season[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSeason(s)}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all capitalize ${
                      season === s
                        ? 'bg-white text-black'
                        : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Vibe */}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/8">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">Vibe</label>
              <div className="space-y-2">
                {VIBES.map(v => (
                  <button
                    key={v.key}
                    onClick={() => setVibe(v.key)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all border ${
                      vibe === v.key
                        ? 'border-white/30 bg-white/10'
                        : 'border-transparent bg-white/3 hover:bg-white/7 hover:border-white/10'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${vibe === v.key ? 'bg-white' : 'bg-zinc-600'}`} />
                    <div>
                      <div className="text-xs font-semibold text-white">{v.label}</div>
                      <div className="text-[10px] text-zinc-500">{v.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/8 space-y-4">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Settings</label>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-white">Outfits to generate</div>
                  <div className="text-[10px] text-zinc-500">Number of final outfits</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setOutfitCount(c => Math.max(1, c - 1))} className="w-7 h-7 rounded-lg bg-white/10 text-white hover:bg-white/20 text-sm font-bold transition-all">−</button>
                  <span className="text-sm font-bold text-white w-4 text-center">{outfitCount}</span>
                  <button onClick={() => setOutfitCount(c => Math.min(10, c + 1))} className="w-7 h-7 rounded-lg bg-white/10 text-white hover:bg-white/20 text-sm font-bold transition-all">+</button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-white">Products per slot</div>
                  <div className="text-[10px] text-zinc-500">Candidates per category</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setProductsPerSlot(c => Math.max(2, c - 1))} className="w-7 h-7 rounded-lg bg-white/10 text-white hover:bg-white/20 text-sm font-bold transition-all">−</button>
                  <span className="text-sm font-bold text-white w-4 text-center">{productsPerSlot}</span>
                  <button onClick={() => setProductsPerSlot(c => Math.min(10, c + 1))} className="w-7 h-7 rounded-lg bg-white/10 text-white hover:bg-white/20 text-sm font-bold transition-all">+</button>
                </div>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRun}
              disabled={running}
              className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2.5 ${
                running
                  ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-zinc-100 active:scale-[0.98] shadow-lg shadow-white/5'
              }`}
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Pipeline Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" fill="currentColor" />
                  Run Auto Pipeline
                </>
              )}
            </button>
          </div>

          {/* ── RIGHT: Progress & Results ───────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Pipeline Steps Visual */}
            {(running || result) && (
              <div className="bg-white/5 rounded-2xl p-5 border border-white/8">
                <div className="flex items-center gap-2 mb-5">
                  {running ? (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  ) : result?.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-xs font-semibold text-zinc-300">
                    {running ? 'Pipeline running...' : currentStep}
                  </span>
                </div>

                <div className="flex items-start gap-0">
                  {PIPELINE_STEPS.map((step, i) => (
                    <div key={step} className="flex items-center flex-1">
                      <StepIndicator step={step} phase={running && !stepPhases[step] ? 'idle' : (stepPhases[step] || 'idle')} />
                      {i < PIPELINE_STEPS.length - 1 && (
                        <div className={`h-0.5 flex-1 mx-1 mb-5 transition-all duration-500 ${
                          stepPhases[PIPELINE_STEPS[i + 1]] && stepPhases[PIPELINE_STEPS[i + 1]] !== 'idle'
                            ? 'bg-emerald-500/50' : 'bg-zinc-700'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Result Summary */}
            {result?.success && !running && (
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-emerald-300">Pipeline Completed Successfully</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-white">{result.productsRegistered}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Products Registered</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-white">{result.outfitsGenerated}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Outfits Generated</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-white">{result.outfitIds.length}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">Outfit IDs Saved</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href="#admin-products"
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-medium text-white transition-all"
                  >
                    <Package className="w-3.5 h-3.5" />
                    View Products
                  </a>
                  <a
                    href="#admin-outfit-linker"
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-medium text-white transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View Outfits
                  </a>
                  <button
                    onClick={handleRun}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-medium text-white transition-all ml-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Run Again
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {(error || (result && !result.success)) && (
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

            {/* No Activity Yet */}
            {!running && !result && !error && (
              <div className="bg-white/3 border border-white/6 rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-1">
                  <Zap className="w-7 h-7 text-zinc-500" />
                </div>
                <div className="text-sm font-medium text-zinc-400">Ready to run</div>
                <div className="text-xs text-zinc-600 max-w-xs">
                  Select gender, body type, vibe, and season, then hit Run Auto Pipeline to start the full automation.
                </div>
              </div>
            )}

            {/* Detailed Logs by Step */}
            {result && (
              <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setShowAllLogs(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-all"
                >
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    Pipeline Logs
                    <span className="bg-white/10 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded-full">
                      {result.events.length} events
                    </span>
                  </span>
                  {showAllLogs
                    ? <ChevronDown className="w-4 h-4 text-zinc-500" />
                    : <ChevronRight className="w-4 h-4 text-zinc-500" />
                  }
                </button>

                {showAllLogs && (
                  <div className="border-t border-white/8">
                    {PIPELINE_STEPS.map(step => {
                      const stepEvents = groupedEvents[step] || [];
                      if (stepEvents.length === 0) return null;
                      const meta = STEP_META[step];
                      const phase = stepPhases[step] || 'idle';
                      const isExpanded = expandedSteps.has(step);

                      return (
                        <div key={step} className="border-b border-white/5 last:border-0">
                          <button
                            onClick={() => toggleStep(step)}
                            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-all text-left"
                          >
                            <span className={`${STATUS_COLOR[phase]}`}>{meta.icon}</span>
                            <span className="text-xs font-semibold text-zinc-300 flex-1">{meta.label}</span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              phase === 'success' ? 'bg-emerald-500/15 text-emerald-400' :
                              phase === 'error' ? 'bg-red-500/15 text-red-400' :
                              'bg-zinc-700 text-zinc-400'
                            }`}>
                              {stepEvents.length} events
                            </span>
                            {isExpanded
                              ? <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
                              : <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                            }
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

            {/* Run History */}
            {history.length > 0 && (
              <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/8">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Recent Runs</span>
                </div>
                <div className="divide-y divide-white/5">
                  {history.slice(0, 5).map((run, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${run.success ? 'bg-emerald-400' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white">
                          {run.gender} · {run.vibe.replace(/_/g, ' ')} · {run.season}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {new Date(run.timestamp).toLocaleString('ko-KR')} · {run.productsRegistered} products · {run.outfitsGenerated} outfits
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-600 truncate max-w-[80px]">
                        {run.batchId.split('-').slice(-1)[0]}
                      </div>
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
