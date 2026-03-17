import { useState, useEffect, useCallback } from 'react';
import { Dna, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import FilterPanel from './FilterPanel';
import CellGrid from './CellGrid';
import CellDetail from './CellDetail';
import { StyleDnaCell, StyleDnaReference, StyleDnaLearnedRule, CellFilter } from './types';
import { ELEVATED_COOL } from '../../data/vibeItems/elevatedCool';
import { EFFORTLESS_NATURAL } from '../../data/vibeItems/effortlessNatural';
import { ARTISTIC_MINIMAL } from '../../data/vibeItems/artisticMinimal';
import { RETRO_LUXE } from '../../data/vibeItems/retroLuxe';
import { SPORT_MODERN } from '../../data/vibeItems/sportModern';
import { CREATIVE_LAYERED } from '../../data/vibeItems/creativeLayered';

const VIBE_MAP: Record<string, Record<string, string>> = {
  ELEVATED_COOL: { A: ELEVATED_COOL.looks.A.name, B: ELEVATED_COOL.looks.B.name, C: ELEVATED_COOL.looks.C.name },
  EFFORTLESS_NATURAL: { A: EFFORTLESS_NATURAL.looks.A.name, B: EFFORTLESS_NATURAL.looks.B.name, C: EFFORTLESS_NATURAL.looks.C.name },
  ARTISTIC_MINIMAL: { A: ARTISTIC_MINIMAL.looks.A.name, B: ARTISTIC_MINIMAL.looks.B.name, C: ARTISTIC_MINIMAL.looks.C.name },
  RETRO_LUXE: { A: RETRO_LUXE.looks.A.name, B: RETRO_LUXE.looks.B.name, C: RETRO_LUXE.looks.C.name },
  SPORT_MODERN: { A: SPORT_MODERN.looks.A.name, B: SPORT_MODERN.looks.B.name, C: SPORT_MODERN.looks.C.name },
  CREATIVE_LAYERED: { A: CREATIVE_LAYERED.looks.A.name, B: CREATIVE_LAYERED.looks.B.name, C: CREATIVE_LAYERED.looks.C.name },
};

export default function StyleDnaLab() {
  const [cells, setCells] = useState<StyleDnaCell[]>([]);
  const [allCells, setAllCells] = useState<StyleDnaCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CellFilter>({
    gender: 'FEMALE',
    bodyType: null,
    vibe: 'ELEVATED_COOL',
    season: null,
    status: null,
  });
  const [selectedCell, setSelectedCell] = useState<StyleDnaCell | null>(null);
  const [references, setReferences] = useState<StyleDnaReference[]>([]);
  const [rules, setRules] = useState<StyleDnaLearnedRule[]>([]);

  const fetchCells = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('style_dna_cells')
        .select('*')
        .order('vibe')
        .order('body_type')
        .order('look_key')
        .order('season');
      if (error) throw error;
      setAllCells(data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCells(); }, [fetchCells]);

  useEffect(() => {
    let filtered = allCells;
    if (filter.gender) filtered = filtered.filter(c => c.gender === filter.gender);
    if (filter.bodyType) filtered = filtered.filter(c => c.body_type === filter.bodyType);
    if (filter.vibe) filtered = filtered.filter(c => c.vibe === filter.vibe);
    if (filter.season) filtered = filtered.filter(c => c.season === filter.season);
    if (filter.status) filtered = filtered.filter(c => c.status === filter.status);
    setCells(filtered);
  }, [allCells, filter]);

  const fetchCellDetails = useCallback(async (cellId: string) => {
    const [refsResult, rulesResult] = await Promise.all([
      supabase.from('style_dna_references').select('*').eq('cell_id', cellId).order('sort_order'),
      supabase.from('style_dna_learned_rules').select('*').eq('cell_id', cellId).order('created_at'),
    ]);
    setReferences(refsResult.data || []);
    setRules(rulesResult.data || []);
  }, []);

  const handleSelectCell = useCallback((cell: StyleDnaCell) => {
    setSelectedCell(cell);
    fetchCellDetails(cell.id);
  }, [fetchCellDetails]);

  const handleDetailUpdate = useCallback(async () => {
    if (selectedCell) {
      await fetchCellDetails(selectedCell.id);
      const { data } = await supabase
        .from('style_dna_cells')
        .select('*')
        .eq('id', selectedCell.id)
        .maybeSingle();
      if (data) {
        setSelectedCell(data);
        setAllCells(prev => prev.map(c => c.id === data.id ? data : c));
      }
    }
  }, [selectedCell, fetchCellDetails]);

  const filteredTotalCells = cells.length;
  const readyCells = cells.filter(c => c.status === 'ready').length;
  const inProgressCells = cells.filter(c => c.status === 'in_progress').length;

  const globalReady = allCells.filter(c => c.status === 'ready').length;

  return (
    <div className="h-screen flex flex-col bg-[#1a1a1a]">
      <div className="shrink-0 px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center border border-teal-500/20">
            <Dna className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Style DNA Lab
              <span className="text-[9px] font-bold bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded-full border border-teal-500/30">
                432 CELLS
              </span>
            </h1>
            <p className="text-[11px] text-white/40">
              Reference curation & style learning matrix
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right mr-2">
            <div className="text-xs text-white/50">
              <span className="text-emerald-400 font-semibold">{globalReady}</span> / 432 ready
            </div>
          </div>
          <button
            onClick={fetchCells}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white text-xs transition-all"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-56 shrink-0 border-r border-white/10 overflow-y-auto">
          <FilterPanel
            filter={filter}
            onChange={setFilter}
            totalCells={filteredTotalCells}
            readyCells={readyCells}
            inProgressCells={inProgressCells}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <CellGrid
            cells={cells}
            selectedCellId={selectedCell?.id || null}
            onSelect={handleSelectCell}
            lookNames={VIBE_MAP}
          />
        </div>

        {selectedCell && (
          <div className="w-96 shrink-0 border-l border-white/10 overflow-hidden">
            <CellDetail
              key={selectedCell.id}
              cell={selectedCell}
              references={references}
              rules={rules}
              lookName={VIBE_MAP[selectedCell.vibe]?.[selectedCell.look_key] || `Look ${selectedCell.look_key}`}
              onUpdate={handleDetailUpdate}
              onClose={() => setSelectedCell(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
