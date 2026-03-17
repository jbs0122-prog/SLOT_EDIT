import { useState, useRef } from 'react';
import {
  X, Plus, Trash2, Loader2, Sparkles, Image as ImageIcon,
  FileText, ChevronDown, ChevronUp, ExternalLink, AlertCircle,
  Palette, Layers, Shirt, Zap, Save, BookOpen
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { StyleDnaCell, StyleDnaReference, StyleDnaLearnedRule, AiAnalysis, LOOK_COLORS, STATUS_STYLES, VIBES } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface CellDetailProps {
  cell: StyleDnaCell;
  references: StyleDnaReference[];
  rules: StyleDnaLearnedRule[];
  lookName: string;
  onUpdate: () => void;
  onClose: () => void;
}

function RuleCard({ rule }: { rule: StyleDnaLearnedRule }) {
  const [open, setOpen] = useState(false);
  const typeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    color_palette: { label: 'Color Palette', icon: <Palette className="w-3.5 h-3.5" /> },
    material_combo: { label: 'Materials', icon: <Layers className="w-3.5 h-3.5" /> },
    silhouette: { label: 'Silhouette', icon: <Shirt className="w-3.5 h-3.5" /> },
    formality: { label: 'Formality', icon: <BookOpen className="w-3.5 h-3.5" /> },
    proportion: { label: 'Proportion', icon: <Layers className="w-3.5 h-3.5" /> },
    keyword: { label: 'Keywords', icon: <FileText className="w-3.5 h-3.5" /> },
  };
  const meta = typeLabels[rule.rule_type] || { label: rule.rule_type, icon: null };
  const confidencePct = Math.round(rule.confidence * 100);

  return (
    <div className="bg-white/[0.03] rounded-lg border border-white/[0.06]">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
        <span className="text-white/40">{meta.icon}</span>
        <span className="text-xs font-medium text-white/70 flex-1">{meta.label}</span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
          confidencePct >= 70 ? 'bg-emerald-500/15 text-emerald-400' :
          confidencePct >= 40 ? 'bg-amber-500/15 text-amber-400' :
          'bg-white/5 text-white/40'
        }`}>
          {confidencePct}%
        </span>
        {open ? <ChevronUp className="w-3 h-3 text-white/30" /> : <ChevronDown className="w-3 h-3 text-white/30" />}
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-white/5">
          <pre className="text-[10px] text-white/40 mt-2 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
            {JSON.stringify(rule.rule_data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function CellDetail({ cell, references, rules, lookName, onUpdate, onClose }: CellDetailProps) {
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [editBrief, setEditBrief] = useState(cell.style_brief || '');
  const [savingBrief, setSavingBrief] = useState(false);
  const [briefDirty, setBriefDirty] = useState(false);
  const [expandedRef, setExpandedRef] = useState<string | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const vibeLabel = VIBES.find(v => v.value === cell.vibe)?.label || cell.vibe;
  const lookStyle = LOOK_COLORS[cell.look_key] || LOOK_COLORS.A;
  const statusStyle = STATUS_STYLES[cell.status] || STATUS_STYLES.empty;

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('style_dna_references').insert({
        cell_id: cell.id,
        image_url: urlInput.trim(),
        source: urlInput.includes('pinterest') ? 'pinterest' : 'url',
        sort_order: references.length,
      });
      if (err) throw err;
      await supabase.from('style_dna_cells').update({
        reference_count: references.length + 1,
        status: cell.status === 'empty' ? 'in_progress' : cell.status,
        updated_at: new Date().toISOString(),
      }).eq('id', cell.id);
      setUrlInput('');
      onUpdate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add reference');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop() || 'png';
        const path = `style-dna/${cell.id}/${Date.now()}_${i}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('product-images')
          .upload(path, file, { contentType: file.type });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
        await supabase.from('style_dna_references').insert({
          cell_id: cell.id,
          image_url: urlData.publicUrl,
          source: 'upload',
          sort_order: references.length + i,
        });
      }
      await supabase.from('style_dna_cells').update({
        reference_count: references.length + files.length,
        status: cell.status === 'empty' ? 'in_progress' : cell.status,
        updated_at: new Date().toISOString(),
      }).eq('id', cell.id);
      onUpdate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteRef = async (refId: string) => {
    try {
      await supabase.from('style_dna_references').delete().eq('id', refId);
      await supabase.from('style_dna_cells').update({
        reference_count: Math.max(0, references.length - 1),
        updated_at: new Date().toISOString(),
      }).eq('id', cell.id);
      onUpdate();
    } catch { /* ignore */ }
  };

  const handleAnalyzeAll = async () => {
    if (references.length === 0) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-style-dna`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'analyze-references',
          cell_id: cell.id,
          reference_ids: references.filter(r => !r.ai_analysis).map(r => r.id),
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }
      onUpdate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExtractRules = async () => {
    const analyzed = references.filter(r => r.ai_analysis);
    if (analyzed.length === 0) return;
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-style-dna`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'extract-rules',
          cell_id: cell.id,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }
      onUpdate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleGenerateBrief = async () => {
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-style-dna`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate-brief',
          cell_id: cell.id,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.brief) {
        setEditBrief(data.brief);
        setBriefDirty(true);
      }
      onUpdate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Brief generation failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveBrief = async () => {
    setSavingBrief(true);
    try {
      await supabase.from('style_dna_cells').update({
        style_brief: editBrief,
        updated_at: new Date().toISOString(),
      }).eq('id', cell.id);
      setBriefDirty(false);
      onUpdate();
    } catch { /* ignore */ }
    finally { setSavingBrief(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusChanging(true);
    try {
      await supabase.from('style_dna_cells').update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', cell.id);
      onUpdate();
    } catch { /* ignore */ }
    finally { setStatusChanging(false); }
  };

  const analyzedCount = references.filter(r => r.ai_analysis).length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${lookStyle.bg} ${lookStyle.text} border ${lookStyle.border}`}>
                Look {cell.look_key}
              </div>
              <div className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                {statusStyle.label}
              </div>
            </div>
            <h3 className="text-sm font-bold text-white truncate">{lookName}</h3>
            <p className="text-[10px] text-white/40 mt-0.5">
              {cell.gender} / {cell.body_type} / {vibeLabel} / {cell.season}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1 mt-2">
          {(['empty', 'in_progress', 'ready'] as const).map(s => (
            <button
              key={s}
              disabled={statusChanging}
              onClick={() => handleStatusChange(s)}
              className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-all ${
                cell.status === s
                  ? 'bg-white text-black'
                  : `${STATUS_STYLES[s].bg} ${STATUS_STYLES[s].text} hover:brightness-125`
              }`}
            >
              {STATUS_STYLES[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-4 mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Style Brief</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleGenerateBrief}
                  disabled={extracting || references.length === 0}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-white/5 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-all"
                >
                  {extracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  AI Generate
                </button>
                {briefDirty && (
                  <button
                    onClick={handleSaveBrief}
                    disabled={savingBrief}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all"
                  >
                    {savingBrief ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={editBrief}
              onChange={e => { setEditBrief(e.target.value); setBriefDirty(true); }}
              placeholder="Describe the style direction for this cell..."
              rows={3}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-white/20"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                References ({references.length})
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleAnalyzeAll}
                  disabled={analyzing || references.length === 0 || analyzedCount === references.length}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-white/5 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-all"
                >
                  {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Analyze {references.length - analyzedCount > 0 ? `(${references.length - analyzedCount})` : 'All'}
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
                placeholder="Paste image URL..."
                className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20"
              />
              <button
                onClick={handleAddUrl}
                disabled={uploading || !urlInput.trim()}
                className="px-3 py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 hover:text-white disabled:opacity-30 transition-all"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full mb-3 py-3 rounded-lg border border-dashed border-white/10 text-xs text-white/30 hover:text-white/50 hover:border-white/20 transition-all flex items-center justify-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Drop images or click to upload'}
            </button>

            {references.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {references.map(ref => (
                  <div
                    key={ref.id}
                    className={`relative group rounded-lg overflow-hidden border transition-all cursor-pointer ${
                      expandedRef === ref.id ? 'border-white/20 col-span-2' : 'border-white/[0.06]'
                    }`}
                    onClick={() => setExpandedRef(expandedRef === ref.id ? null : ref.id)}
                  >
                    <div className="aspect-[3/4] relative">
                      <img
                        src={ref.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteRef(ref.id); }}
                        className="absolute top-1.5 right-1.5 p-1 rounded bg-black/60 text-white/60 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {ref.ai_analysis && (
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-medium border border-emerald-500/30">
                          Analyzed
                        </div>
                      )}
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="px-1.5 py-0.5 rounded bg-black/60 text-[8px] text-white/60 capitalize">
                          {ref.source}
                        </span>
                      </div>
                    </div>

                    {expandedRef === ref.id && ref.ai_analysis && (
                      <AnalysisDetail analysis={ref.ai_analysis} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {rules.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  Learned Rules ({rules.length})
                </label>
                <button
                  onClick={handleExtractRules}
                  disabled={extracting || analyzedCount === 0}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-white/5 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-30 transition-all"
                >
                  {extracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Re-extract
                </button>
              </div>
              <div className="space-y-1.5">
                {rules.map(r => <RuleCard key={r.id} rule={r} />)}
              </div>
            </div>
          )}

          {rules.length === 0 && analyzedCount > 0 && (
            <button
              onClick={handleExtractRules}
              disabled={extracting}
              className="w-full py-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50 hover:text-white/70 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Extract Rules from {analyzedCount} analyzed references
            </button>
          )}

          <div className="flex gap-2 pt-2 pb-4">
            <a
              href={`#admin-auto-pipeline?gender=${cell.gender}&body_type=${cell.body_type}&vibe=${cell.vibe}&season=${cell.season}&look=${cell.look_key}`}
              className="flex-1 py-2.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 hover:text-white text-xs font-medium text-center transition-all flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              Run Pipeline
            </a>
            <a
              href={`#admin-amazon?vibe=${cell.vibe}&look=${cell.look_key}&gender=${cell.gender}&season=${cell.season}`}
              className="flex-1 py-2.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 hover:text-white text-xs font-medium text-center transition-all flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Amazon Search
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisDetail({ analysis }: { analysis: AiAnalysis }) {
  return (
    <div className="p-3 border-t border-white/5 space-y-2">
      <p className="text-[11px] text-white/60 italic">{analysis.overall_impression}</p>
      {analysis.colors?.length > 0 && (
        <div>
          <span className="text-[9px] uppercase text-white/30">Colors</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {analysis.colors.map((c, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-white/50">{c}</span>
            ))}
          </div>
        </div>
      )}
      {analysis.materials?.length > 0 && (
        <div>
          <span className="text-[9px] uppercase text-white/30">Materials</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {analysis.materials.map((m, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-white/50">{m}</span>
            ))}
          </div>
        </div>
      )}
      {analysis.items?.length > 0 && (
        <div>
          <span className="text-[9px] uppercase text-white/30">Items</span>
          <div className="space-y-1 mt-1">
            {analysis.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-white/40">
                <span className="text-white/20 uppercase w-14 shrink-0">{item.slot}</span>
                <span className="text-white/50">{item.description}</span>
                <span className="text-white/30">{item.color}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {analysis.color_strategy && (
        <div className="text-[10px] text-white/30">
          Color strategy: <span className="text-white/50">{analysis.color_strategy}</span>
        </div>
      )}
    </div>
  );
}
