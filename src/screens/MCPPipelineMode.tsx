import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Server, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight,
  BarChart3, ThumbsUp, ThumbsDown, Check, X, TrendingUp, Lightbulb,
  Package, ExternalLink, RefreshCw, Brain,
} from 'lucide-react';
import { supabase } from '../utils/supabase';

type Gender = 'MALE' | 'FEMALE' | 'UNISEX';
type BodyType = 'slim' | 'regular' | 'plus-size';
type Vibe = 'ELEVATED_COOL' | 'EFFORTLESS_NATURAL' | 'ARTISTIC_MINIMAL' | 'RETRO_LUXE' | 'SPORT_MODERN' | 'CREATIVE_LAYERED';
type Season = 'spring' | 'summer' | 'fall' | 'winter';

interface MCPLog {
  id: string;
  batch_id: string;
  step: string;
  status: string;
  message: string;
  created_at: string;
}

interface MCPRun {
  batch_id: string;
  status: string;
  phase: string;
  registered_count: number;
  outfit_ids: string[];
  outfit_candidates: OutfitCandidate[];
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

interface OutfitCandidate {
  outfitId: string;
  items: { slot: string; productId: string; name: string; imageUrl: string; price?: number; color?: string; sub_category?: string }[];
  matchScore?: number;
  scoreBreakdown?: Record<string, number>;
  lookKey?: string;
  lookLabel?: string;
  insight?: string;
}

interface LearningInsights {
  topKeywords: { keyword: string; slot: string; score: number; accepted_count: number; total_count: number }[];
  topItems: { slot: string; item_name: string; score: number; success_count: number; fail_count: number }[];
  acceptanceRate: number | null;
  totalFeedback: number;
}

const STEP_META: Record<string, { label: string }> = {
  keywords: { label: 'Rule Keywords' },
  search: { label: 'Amazon Search' },
  register: { label: 'Analyze & Register' },
  nobg: { label: 'Background Removal' },
  outfits: { label: 'Match Engine' },
  system: { label: 'System' },
};

const SLOT_LABEL: Record<string, string> = {
  top: '상의', bottom: '하의', shoes: '신발',
  bag: '가방', accessory: '액세서리', outer: '아우터', mid: '미드레이어',
};

const SCORE_LABELS: Record<string, string> = {
  tonalHarmony: 'Tonal', formalityCoherence: 'Formal', materialCompat: 'Material',
  vibeMatch: 'Vibe', seasonFit: 'Season', colorDepth: 'Color',
  patternBalance: 'Pattern', accessoryHarmony: 'Acc.Harm',
};

function scoreColor(val: number): string {
  if (val >= 80) return 'bg-emerald-500';
  if (val >= 60) return 'bg-sky-500';
  if (val >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function MCPOutfitCard({ candidate, selected, onToggle }: {
  candidate: OutfitCandidate; selected: boolean; onToggle: () => void;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const essentials = candidate.items.filter(i => ['top', 'bottom', 'shoes'].includes(i.slot));
  const optionals = candidate.items.filter(i => !['top', 'bottom', 'shoes'].includes(i.slot));
  const bd = candidate.scoreBreakdown;

  return (
    <div className={`relative rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
      selected ? 'border-emerald-500 bg-emerald-500/8 shadow-lg shadow-emerald-500/10' : 'border-white/10 bg-white/4 hover:border-white/20 hover:bg-white/6'
    }`}>
      <div onClick={onToggle} className="cursor-pointer p-4">
        <div className={`absolute top-3 right-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          selected ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-white/30'
        }`}>
          {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
        </div>
        <div className="flex items-center gap-2 mb-3">
          {candidate.lookKey && (
            <span className="text-xs font-bold text-zinc-300">Look {candidate.lookKey}</span>
          )}
          {candidate.lookLabel && (
            <span className="text-[10px] text-zinc-500">{candidate.lookLabel}</span>
          )}
          {candidate.matchScore !== undefined && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              candidate.matchScore >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
              candidate.matchScore >= 50 ? 'bg-sky-500/20 text-sky-400' : 'bg-amber-500/20 text-amber-400'
            }`}>{candidate.matchScore}pt</span>
          )}
          {optionals.length > 0 && (
            <span className="text-[10px] text-zinc-500 bg-white/6 px-2 py-0.5 rounded-full">+{optionals.length}</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {essentials.map(item => (
            <div key={item.slot} className="flex flex-col gap-1">
              <div className="aspect-square bg-zinc-800 rounded-lg overflow-hidden">
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1"
                  onError={e => { e.currentTarget.src = 'https://placehold.co/100x100?text=No+Img'; }} />
              </div>
              <span className="text-[9px] text-zinc-500 text-center truncate">{SLOT_LABEL[item.slot] || item.slot}</span>
            </div>
          ))}
        </div>
        {optionals.length > 0 && (
          <div className="flex gap-1.5 mt-1">
            {optionals.map(item => (
              <div key={item.slot} className="flex flex-col gap-0.5 flex-1">
                <div className="aspect-square bg-zinc-800/60 rounded-md overflow-hidden">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1"
                    onError={e => { e.currentTarget.src = 'https://placehold.co/60x60?text=?'; }} />
                </div>
                <span className="text-[8px] text-zinc-600 text-center truncate">{SLOT_LABEL[item.slot] || item.slot}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {candidate.insight && (
        <div className="px-4 pb-2 pt-0">
          <div className="flex items-start gap-1.5 bg-white/4 rounded-lg px-3 py-2">
            <Lightbulb className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-zinc-400 leading-relaxed">{candidate.insight}</p>
          </div>
        </div>
      )}

      {bd && (
        <div className="px-4 pb-3">
          <button onClick={e => { e.stopPropagation(); setShowBreakdown(!showBreakdown); }}
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
    </div>
  );
}

function LearningInsightsPanel({ vibe, season }: { vibe: Vibe; season: Season }) {
  const [insights, setInsights] = useState<LearningInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      let authHeader = `Bearer ${anonKey}`;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) authHeader = `Bearer ${session.access_token}`;
      } catch { /**/ }

      const r = await fetch(`${supabaseUrl}/functions/v1/mcp-pipeline-orchestrator`, {
        method: 'POST',
        headers: { Authorization: authHeader, apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-learning-insights', vibe, season }),
      });
      if (r.ok) setInsights(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !insights) load();
  }, [open]);

  const bySlot = (insights?.topItems || []).reduce<Record<string, typeof insights.topItems>>((acc, item) => {
    if (!acc[item.slot]) acc[item.slot] = [];
    acc[item.slot].push(item);
    return acc;
  }, {});

  return (
    <div className="bg-white/5 rounded-2xl border border-white/8 overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-all">
        <div className="flex items-center gap-2.5">
          <Brain className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-zinc-300">Learning Insights</span>
          {insights?.totalFeedback ? (
            <span className="text-[10px] bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
              {insights.totalFeedback} sessions
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); load(); }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-all">
            <RefreshCw className="w-3 h-3" />
          </button>
          {open ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-white/8 p-5">
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-500 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />학습 데이터 로딩 중...
            </div>
          ) : !insights || insights.totalFeedback === 0 ? (
            <div className="text-center py-4">
              <TrendingUp className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">아직 학습 데이터가 없습니다.</p>
              <p className="text-[10px] text-zinc-600 mt-1">파이프라인을 실행하고 코디를 승인/거절하면 자동으로 학습됩니다.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {insights.acceptanceRate !== null && (
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-white">{insights.acceptanceRate}%</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">채택률</div>
                  </div>
                  <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-white">{insights.totalFeedback}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">총 피드백</div>
                  </div>
                  <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-white">{insights.topItems.length}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">학습 아이템</div>
                  </div>
                </div>
              )}

              {Object.keys(bySlot).length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">슬롯별 상위 아이템</div>
                  <div className="space-y-2">
                    {Object.entries(bySlot).slice(0, 5).map(([slot, items]) => (
                      <div key={slot} className="flex items-start gap-2">
                        <span className="text-[9px] text-zinc-500 bg-white/8 px-2 py-0.5 rounded-full shrink-0 mt-0.5 w-16 text-center">
                          {SLOT_LABEL[slot] || slot}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {items.slice(0, 3).map(item => (
                            <span key={item.item_name} className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                              {item.item_name} <span className="text-emerald-600">{Math.round(item.score * 100)}%</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.topKeywords.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">상위 성과 키워드</div>
                  <div className="flex flex-wrap gap-1.5">
                    {insights.topKeywords.slice(0, 8).map(kw => (
                      <span key={kw.keyword} className="text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full">
                        {kw.keyword.length > 30 ? kw.keyword.slice(0, 30) + '…' : kw.keyword}
                        <span className="text-sky-600 ml-1">{Math.round(kw.score * 100)}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MCPPipelineMode({
  gender, bodyType, vibe, season, productsPerSlot,
}: {
  gender: Gender; bodyType: BodyType; vibe: Vibe; season: Season; productsPerSlot: number;
}) {
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [run, setRun] = useState<MCPRun | null>(null);
  const [logs, setLogs] = useState<MCPLog[]>([]);
  const [starting, setStarting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<Set<string>>(new Set());
  const [showLogs, setShowLogs] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const logEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLogTimeRef = useRef<string>('');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const getAuthHeader = useCallback(async () => {
    let header = `Bearer ${anonKey}`;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) header = `Bearer ${session.access_token}`;
    } catch { /**/ }
    return header;
  }, [anonKey]);

  const poll = useCallback(async (batchId: string) => {
    try {
      const authHeader = await getAuthHeader();
      const afterParam = lastLogTimeRef.current ? `&after=${encodeURIComponent(lastLogTimeRef.current)}` : '';
      const r = await fetch(
        `${supabaseUrl}/functions/v1/mcp-pipeline-orchestrator?batchId=${batchId}${afterParam}`,
        { headers: { Authorization: authHeader, apikey: anonKey } }
      );
      if (!r.ok) return;
      const data = await r.json();
      if (data.run) setRun(data.run);
      if (data.logs?.length) {
        setLogs(prev => {
          const existingIds = new Set(prev.map((l: MCPLog) => l.id));
          const newLogs = data.logs.filter((l: MCPLog) => !existingIds.has(l.id));
          if (newLogs.length) {
            lastLogTimeRef.current = newLogs[newLogs.length - 1].created_at;
            return [...prev, ...newLogs];
          }
          return prev;
        });
      }
      if (data.run?.status === 'completed' || data.run?.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current);
        if (data.run?.outfit_candidates) {
          setSelectedOutfitIds(new Set((data.run.outfit_candidates as OutfitCandidate[]).map(c => c.outfitId)));
        }
      }
    } catch { /**/ }
  }, [supabaseUrl, anonKey, getAuthHeader]);

  useEffect(() => {
    if (activeBatchId) {
      poll(activeBatchId);
      pollRef.current = setInterval(() => poll(activeBatchId), 3000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [activeBatchId, poll]);

  useEffect(() => {
    if (logEndRef.current && showLogs) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs, showLogs]);

  const handleStart = async () => {
    setStarting(true);
    setRun(null);
    setLogs([]);
    setSavedCount(0);
    setSelectedOutfitIds(new Set());
    lastLogTimeRef.current = '';
    if (pollRef.current) clearInterval(pollRef.current);

    try {
      const authHeader = await getAuthHeader();
      const r = await fetch(`${supabaseUrl}/functions/v1/mcp-pipeline-orchestrator`, {
        method: 'POST',
        headers: { Authorization: authHeader, apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', gender, bodyType, vibe, season, productsPerSlot }),
      });
      if (!r.ok) throw new Error(`Start failed: ${r.status}`);
      const { batchId } = await r.json();
      setActiveBatchId(batchId);
    } catch (err) {
      alert('파이프라인 시작 실패: ' + (err as Error).message);
    } finally {
      setStarting(false);
    }
  };

  const handleSaveSelected = async () => {
    if (!run || selectedOutfitIds.size === 0) return;
    setSaving(true);
    try {
      const authHeader = await getAuthHeader();
      const allIds = run.outfit_ids as string[];
      const acceptedIds = Array.from(selectedOutfitIds);
      const rejectedIds = allIds.filter(id => !selectedOutfitIds.has(id));

      await fetch(`${supabaseUrl}/functions/v1/mcp-pipeline-orchestrator`, {
        method: 'POST',
        headers: { Authorization: authHeader, apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit-feedback', batchId: activeBatchId,
          acceptedIds, rejectedIds, vibe, season,
        }),
      });
      setSavedCount(acceptedIds.length);
      setSelectedOutfitIds(new Set());
      setRun(prev => prev ? { ...prev, outfit_candidates: [] } : prev);
    } catch (err) {
      alert('저장 실패: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const isRunning = run?.status === 'running' || run?.status === 'pending' || starting;
  const isDone = run?.status === 'completed';
  const isFailed = run?.status === 'failed';
  const hasCandidates = isDone && (run?.outfit_candidates?.length ?? 0) > 0;

  const groupedLogs = logs.reduce<Record<string, MCPLog[]>>((acc, log) => {
    const step = log.step || 'system';
    if (!acc[step]) acc[step] = [];
    acc[step].push(log);
    return acc;
  }, {});

  const getStepStatus = (step: string) => {
    const stepLogs = groupedLogs[step] || [];
    if (!stepLogs.length) return 'idle';
    if (stepLogs.some(l => l.status === 'error')) return 'error';
    if (stepLogs.some(l => l.status === 'success')) return 'success';
    return stepLogs[stepLogs.length - 1]?.status || 'idle';
  };

  const STEPS = ['keywords', 'search', 'register', 'nobg', 'outfits'];

  return (
    <div className="space-y-4">

      {/* MCP Mode Header */}
      <div className="bg-gradient-to-r from-sky-500/10 to-blue-500/5 border border-sky-500/20 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-500/15 rounded-xl flex items-center justify-center">
            <Server className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              MCP Mode
              <span className="text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full">서버 실행</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">탭을 닫아도 파이프라인이 계속 실행됩니다. 학습 데이터가 자동으로 반영됩니다.</div>
          </div>
        </div>
      </div>

      {/* Learning Insights */}
      <LearningInsightsPanel vibe={vibe} season={season} />

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={isRunning}
        className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2.5 ${
          isRunning
            ? 'bg-sky-600/50 text-sky-300 cursor-not-allowed'
            : 'bg-sky-500 text-white hover:bg-sky-400 active:scale-[0.98] shadow-lg shadow-sky-500/20'
        }`}
      >
        {isRunning ? <><Loader2 className="w-4 h-4 animate-spin" />실행 중 (서버)...</> : <><Server className="w-4 h-4" />MCP 파이프라인 실행</>}
      </button>

      {/* Progress steps */}
      {(isRunning || isDone || isFailed) && (
        <div className="bg-white/5 rounded-2xl p-5 border border-white/8">
          <div className="flex items-center gap-2 mb-5">
            {isRunning ? <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
              : isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              : <XCircle className="w-4 h-4 text-red-400" />}
            <span className="text-xs font-semibold text-zinc-300">
              {isRunning ? `실행 중 — phase: ${run?.phase || 'starting'}...`
                : isDone ? `완료 — ${run?.registered_count}개 제품 등록`
                : `실패: ${run?.error_message}`}
            </span>
          </div>
          <div className="flex items-start gap-0">
            {STEPS.map((step, i) => {
              const phase = getStepStatus(step);
              const isRunningStep = phase === 'start' || phase === 'progress';
              const isSuccessStep = phase === 'success';
              const isErrorStep = phase === 'error';
              const isIdleStep = phase === 'idle';
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                      ${isIdleStep ? 'border-zinc-700 text-zinc-600 bg-zinc-900' : ''}
                      ${isRunningStep ? 'border-sky-500 text-sky-400 bg-sky-500/10 animate-pulse' : ''}
                      ${isSuccessStep ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' : ''}
                      ${isErrorStep ? 'border-red-500 text-red-400 bg-red-500/10' : ''}`}>
                      {isRunningStep ? <Loader2 className="w-4 h-4 animate-spin" /> :
                        isSuccessStep ? <CheckCircle2 className="w-4 h-4" /> :
                        isErrorStep ? <XCircle className="w-4 h-4" /> :
                        <span className="text-[10px] font-bold">{i + 1}</span>}
                    </div>
                    <span className={`text-[10px] font-medium text-center leading-tight ${
                      isIdleStep ? 'text-zinc-600' : isRunningStep ? 'text-sky-400' :
                      isSuccessStep ? 'text-emerald-400' : 'text-red-400'
                    }`}>{STEP_META[step]?.label || step}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 mb-5 transition-all duration-500 ${
                      getStepStatus(STEPS[i + 1]) !== 'idle' ? 'bg-sky-500/40' : 'bg-zinc-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Outfit candidates */}
      {hasCandidates && (
        <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                코디 후보 선택
                <span className="text-[10px] font-normal text-zinc-500">
                  avg {Math.round((run!.outfit_candidates).reduce((s, c) => s + (c.matchScore || 0), 0) / run!.outfit_candidates.length)}pt
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                <ThumbsUp className="w-3 h-3 inline mr-1" />{selectedOutfitIds.size} accept
                <span className="mx-1.5 text-zinc-600">|</span>
                <ThumbsDown className="w-3 h-3 inline mr-1" />{run!.outfit_candidates.length - selectedOutfitIds.size} reject
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedOutfitIds(new Set(run!.outfit_candidates.map(c => c.outfitId)))}
                className="text-[11px] text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/8 transition-all">전체 선택</button>
              <button onClick={() => setSelectedOutfitIds(new Set())}
                className="text-[11px] text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/8 transition-all">전체 해제</button>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {run!.outfit_candidates.map(candidate => (
              <MCPOutfitCard
                key={candidate.outfitId}
                candidate={candidate}
                selected={selectedOutfitIds.has(candidate.outfitId)}
                onToggle={() => setSelectedOutfitIds(prev => {
                  const n = new Set(prev);
                  n.has(candidate.outfitId) ? n.delete(candidate.outfitId) : n.add(candidate.outfitId);
                  return n;
                })}
              />
            ))}
          </div>
          <div className="px-4 pb-4 flex items-center gap-3">
            <button
              onClick={handleSaveSelected}
              disabled={saving || selectedOutfitIds.size === 0}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                selectedOutfitIds.size === 0 ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' :
                saving ? 'bg-emerald-600 text-white cursor-not-allowed' :
                'bg-emerald-500 text-white hover:bg-emerald-400 active:scale-[0.98]'
              }`}
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />저장 + 학습 데이터 전송 중...</> :
                <><ThumbsUp className="w-4 h-4" />{selectedOutfitIds.size}개 등록 + 학습 반영</>}
            </button>
            <button
              onClick={() => {
                const all = run?.outfit_ids as string[] || [];
                if (all.length) supabase.from('outfits').delete().in('id', all);
                setRun(prev => prev ? { ...prev, outfit_candidates: [] } : prev);
              }}
              className="px-4 py-3 rounded-xl font-medium text-sm text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <X className="w-4 h-4" />전체 취소
            </button>
          </div>
        </div>
      )}

      {/* Saved confirmation */}
      {savedCount > 0 && !hasCandidates && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="font-bold text-emerald-300">코디 등록 완료</div>
              <div className="text-xs text-emerald-400/70 mt-0.5">{savedCount}개 코디 + 학습 데이터 반영됨</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">{run?.registered_count ?? 0}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Products Registered</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">{savedCount}</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Outfits Saved</div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <a href="#admin-products" className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-medium text-white transition-all">
              <Package className="w-3.5 h-3.5" />View Products
            </a>
            <a href="#admin-outfit-linker" className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-medium text-white transition-all">
              <ExternalLink className="w-3.5 h-3.5" />View Outfits
            </a>
            <button onClick={handleStart} className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-medium text-white transition-all ml-auto">
              <RefreshCw className="w-3.5 h-3.5" />Run Again
            </button>
          </div>
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
          <button onClick={() => setShowLogs(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-all">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-zinc-500" />
              Server Logs
              <span className="bg-white/10 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded-full">{logs.length}</span>
            </span>
            {showLogs ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
          </button>
          {showLogs && (
            <div className="border-t border-white/8">
              {Object.entries(groupedLogs).map(([step, stepLogs]) => {
                const isExpanded = expandedSteps.has(step);
                const lastStatus = stepLogs[stepLogs.length - 1]?.status || 'progress';
                return (
                  <div key={step} className="border-b border-white/5 last:border-0">
                    <button onClick={() => setExpandedSteps(prev => {
                      const n = new Set(prev); n.has(step) ? n.delete(step) : n.add(step); return n;
                    })} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-all text-left">
                      <span className="text-xs font-semibold text-zinc-300 flex-1">{STEP_META[step]?.label || step}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        lastStatus === 'success' ? 'bg-emerald-500/15 text-emerald-400' :
                        lastStatus === 'error' ? 'bg-red-500/15 text-red-400' : 'bg-zinc-700 text-zinc-400'
                      }`}>{stepLogs.length}</span>
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-600" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />}
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-3 space-y-0.5 bg-black/20">
                        {stepLogs.map((log, i) => (
                          <div key={i} className="flex items-start gap-3 py-1.5">
                            <span className="text-[10px] text-zinc-600 font-mono mt-0.5 shrink-0 w-20">
                              {new Date(log.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className={`mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full ${
                              log.status === 'success' ? 'bg-emerald-400' :
                              log.status === 'error' ? 'bg-red-500' :
                              log.status === 'start' ? 'bg-blue-400' : 'bg-zinc-500'
                            }`} />
                            <span className={`text-xs leading-relaxed ${
                              log.status === 'success' ? 'text-emerald-400' :
                              log.status === 'error' ? 'text-red-400' :
                              log.status === 'start' ? 'text-blue-400' : 'text-zinc-400'
                            }`}>{log.message}</span>
                          </div>
                        ))}
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
    </div>
  );
}
