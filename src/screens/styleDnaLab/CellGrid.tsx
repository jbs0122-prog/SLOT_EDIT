import { Image, Layers } from 'lucide-react';
import { StyleDnaCell, LOOK_COLORS, STATUS_STYLES, VIBES } from './types';

interface CellGridProps {
  cells: StyleDnaCell[];
  selectedCellId: string | null;
  onSelect: (cell: StyleDnaCell) => void;
  lookNames: Record<string, Record<string, string>>;
}

function getVibeLabel(vibe: string): string {
  return VIBES.find(v => v.value === vibe)?.label || vibe;
}

function CellCard({ cell, isSelected, onClick, lookName }: {
  cell: StyleDnaCell;
  isSelected: boolean;
  onClick: () => void;
  lookName: string;
}) {
  const lookStyle = LOOK_COLORS[cell.look_key] || LOOK_COLORS.A;
  const statusStyle = STATUS_STYLES[cell.status] || STATUS_STYLES.empty;

  return (
    <button
      onClick={onClick}
      className={`relative group text-left w-full rounded-xl border transition-all duration-200 overflow-hidden ${
        isSelected
          ? 'border-white/40 bg-white/10 ring-1 ring-white/20'
          : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/15'
      }`}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${lookStyle.bg} ${lookStyle.text} border ${lookStyle.border}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${lookStyle.dot}`} />
            Look {cell.look_key}
          </div>
          <div className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </div>
        </div>

        <div className="text-[11px] font-medium text-white/80 truncate mb-0.5">
          {lookName}
        </div>

        <div className="text-[10px] text-white/30 capitalize">
          {cell.season}
        </div>

        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1 text-[10px] text-white/30">
            <Image className="w-3 h-3" />
            <span>{cell.reference_count}</span>
          </div>
          {cell.style_brief && (
            <div className="flex items-center gap-1 text-[10px] text-white/30">
              <Layers className="w-3 h-3" />
              <span>Brief</span>
            </div>
          )}
        </div>
      </div>

      {isSelected && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/60" />
      )}
    </button>
  );
}

export default function CellGrid({ cells, selectedCellId, onSelect, lookNames }: CellGridProps) {
  if (cells.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
            <Layers className="w-6 h-6 text-white/20" />
          </div>
          <p className="text-sm text-white/40">Select filters to view cells</p>
          <p className="text-xs text-white/20 mt-1">Choose Gender + Vibe at minimum</p>
        </div>
      </div>
    );
  }

  const grouped = cells.reduce<Record<string, StyleDnaCell[]>>((acc, cell) => {
    const key = `${cell.vibe}__${cell.body_type}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(cell);
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {Object.entries(grouped).map(([groupKey, groupCells]) => {
        const [vibe, bodyType] = groupKey.split('__');
        const seasonOrder = ['spring', 'summer', 'fall', 'winter'];
        const lookOrder = ['A', 'B', 'C'];

        const matrix: Record<string, Record<string, StyleDnaCell>> = {};
        for (const c of groupCells) {
          if (!matrix[c.look_key]) matrix[c.look_key] = {};
          matrix[c.look_key][c.season] = c;
        }

        return (
          <div key={groupKey} className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-xs font-semibold text-white/70">{getVibeLabel(vibe)}</span>
              <span className="text-[10px] text-white/30 capitalize">/ {bodyType}</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-16 px-1 py-1.5 text-[9px] uppercase tracking-wider text-white/25 text-left font-medium">
                      Look
                    </th>
                    {seasonOrder.map(s => (
                      <th key={s} className="px-1 py-1.5 text-[9px] uppercase tracking-wider text-white/25 text-center font-medium">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lookOrder.map(look => (
                    <tr key={look}>
                      <td className="px-1 py-1 align-top">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded ${LOOK_COLORS[look].bg}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${LOOK_COLORS[look].dot}`} />
                          <span className={`text-[10px] font-semibold ${LOOK_COLORS[look].text}`}>{look}</span>
                        </div>
                      </td>
                      {seasonOrder.map(season => {
                        const cell = matrix[look]?.[season];
                        if (!cell) return <td key={season} className="px-1 py-1" />;
                        const lookName = lookNames[cell.vibe]?.[cell.look_key] || `Look ${cell.look_key}`;
                        return (
                          <td key={season} className="px-1 py-1">
                            <CellCard
                              cell={cell}
                              isSelected={selectedCellId === cell.id}
                              onClick={() => onSelect(cell)}
                              lookName={lookName}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
