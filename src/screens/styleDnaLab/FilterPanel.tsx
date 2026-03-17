import { Filter, RotateCcw } from 'lucide-react';
import { CellFilter, GENDERS, BODY_TYPES, VIBES, SEASONS, STATUS_STYLES } from './types';

interface FilterPanelProps {
  filter: CellFilter;
  onChange: (f: CellFilter) => void;
  totalCells: number;
  readyCells: number;
  inProgressCells: number;
}

export default function FilterPanel({ filter, onChange, totalCells, readyCells, inProgressCells }: FilterPanelProps) {
  const update = (patch: Partial<CellFilter>) => onChange({ ...filter, ...patch });
  const hasFilter = Object.values(filter).some(v => v !== null);

  const readyPct = totalCells > 0 ? Math.round((readyCells / totalCells) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-white/50" />
            <span className="text-sm font-semibold text-white">Filters</span>
          </div>
          {hasFilter && (
            <button
              onClick={() => onChange({ gender: null, bodyType: null, vibe: null, season: null, status: null })}
              className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        <div className="bg-white/5 rounded-lg p-3 mb-1">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs text-white/50">Progress</span>
            <span className="text-lg font-bold text-white">{readyPct}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${readyPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-white/40">
            <span>{readyCells} ready</span>
            <span>{inProgressCells} in progress</span>
            <span>{totalCells} total</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-2">Gender</label>
          <div className="grid grid-cols-2 gap-1.5">
            {GENDERS.map(g => (
              <button
                key={g.value}
                onClick={() => update({ gender: filter.gender === g.value ? null : g.value })}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  filter.gender === g.value
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-2">Body Type</label>
          <div className="grid grid-cols-3 gap-1.5">
            {BODY_TYPES.map(b => (
              <button
                key={b.value}
                onClick={() => update({ bodyType: filter.bodyType === b.value ? null : b.value })}
                className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                  filter.bodyType === b.value
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-2">Vibe</label>
          <div className="space-y-1.5">
            {VIBES.map(v => (
              <button
                key={v.value}
                onClick={() => update({ vibe: filter.vibe === v.value ? null : v.value })}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                  filter.vibe === v.value
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="text-xs font-medium">{v.label}</div>
                <div className={`text-[10px] mt-0.5 ${filter.vibe === v.value ? 'text-black/50' : 'text-white/30'}`}>
                  {v.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-2">Season</label>
          <div className="grid grid-cols-4 gap-1.5">
            {SEASONS.map(s => (
              <button
                key={s.value}
                onClick={() => update({ season: filter.season === s.value ? null : s.value })}
                className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                  filter.season === s.value
                    ? 'bg-white text-black'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-2">Status</label>
          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(STATUS_STYLES).map(([key, style]) => (
              <button
                key={key}
                onClick={() => update({ status: filter.status === key ? null : key })}
                className={`px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                  filter.status === key
                    ? 'bg-white text-black'
                    : `${style.bg} ${style.text} hover:brightness-125`
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
