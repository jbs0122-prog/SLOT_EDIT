import { useState, useEffect, useRef } from 'react';
import { Move, Maximize2, RotateCcw, Check, X } from 'lucide-react';
import type { EditorProductData } from '../utils/flatlayRenderer';

const SLOT_Z_INDEX: Record<string, number> = {
  outer: 1, top: 2, mid: 3, bottom: 4, shoes: 5, bag: 6, accessory: 7, accessory_2: 8,
};

const SLOT_LABELS: Record<string, string> = {
  outer: 'Outer', top: 'Top', mid: 'Mid', bottom: 'Bottom',
  shoes: 'Shoes', bag: 'Bag', accessory: 'Acc', accessory_2: 'Acc 2',
};

const MIN_SIZE = 50;

type Corner = 'tl' | 'tr' | 'bl' | 'br';

interface DragState {
  type: 'move' | 'resize';
  itemIndex: number;
  corner?: Corner;
  startClientX: number;
  startClientY: number;
  startItem: EditorProductData;
}

interface FlatLayEditorProps {
  items: EditorProductData[];
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  onConfirm: (updatedItems: EditorProductData[]) => void;
  onCancel: () => void;
}

function resizeItem(
  item: EditorProductData,
  dx: number,
  dy: number,
  corner: Corner
): EditorProductData {
  const signX = corner.endsWith('r') ? 1 : -1;
  const signY = corner.startsWith('b') ? 1 : -1;

  const diagLen = Math.sqrt(item.width ** 2 + item.height ** 2);
  const proj = (signX * dx * item.width + signY * dy * item.height) / diagLen;
  const newDiag = Math.max(diagLen + proj, MIN_SIZE * Math.SQRT2);
  const sf = newDiag / diagLen;

  const newW = item.width * sf;
  const newH = item.height * sf;

  const newX = corner.endsWith('l') ? item.x + item.width - newW : item.x;
  const newY = corner.startsWith('t') ? item.y + item.height - newH : item.y;

  return { ...item, x: newX, y: newY, width: newW, height: newH };
}

export default function FlatLayEditor({
  items: initialItems,
  canvasWidth,
  canvasHeight,
  backgroundColor,
  onConfirm,
  onCancel,
}: FlatLayEditorProps) {
  const [items, setItems] = useState(initialItems);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const scaleRef = useRef(0);

  const scale = containerWidth > 0 ? containerWidth / canvasWidth : 0;
  scaleRef.current = scale;

  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();

      const s = scaleRef.current;
      if (s === 0) return;

      const dx = (e.clientX - drag.startClientX) / s;
      const dy = (e.clientY - drag.startClientY) / s;
      const item = drag.startItem;

      setItems(prev => prev.map((it, i) => {
        if (i !== drag.itemIndex) return it;
        if (drag.type === 'move') {
          return { ...item, x: item.x + dx, y: item.y + dy };
        }
        if (drag.type === 'resize' && drag.corner) {
          return resizeItem(item, dx, dy, drag.corner);
        }
        return it;
      }));
    };

    const handleUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, []);

  const handlePointerDown = (
    e: React.PointerEvent,
    index: number,
    type: 'move' | 'resize',
    corner?: Corner
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIndex(index);
    dragRef.current = {
      type,
      itemIndex: index,
      corner,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startItem: { ...items[index] },
    };
  };

  const handleReset = () => {
    setItems(initialItems);
    setSelectedIndex(null);
  };

  const proxyBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-ibb-image?url=`;

  const sortedItems = [...items]
    .map((item, origIndex) => ({ item, origIndex }))
    .sort((a, b) => (SLOT_Z_INDEX[a.item.slot_type] || 99) - (SLOT_Z_INDEX[b.item.slot_type] || 99));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Move size={12} /> 드래그: 이동</span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1"><Maximize2 size={12} /> 모서리: 크기 조정 (비율 유지)</span>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RotateCcw size={12} />
          초기화
        </button>
      </div>

      <div ref={wrapperRef} className="w-full">
        {scale > 0 && (
          <div
            className="relative mx-auto rounded-lg overflow-hidden ring-1 ring-gray-200"
            style={{
              width: containerWidth,
              height: canvasHeight * scale,
              backgroundColor,
            }}
            onClick={() => setSelectedIndex(null)}
          >
            {sortedItems.map(({ item, origIndex }) => {
              const isSelected = selectedIndex === origIndex;
              const zIndex = (SLOT_Z_INDEX[item.slot_type] || 99) + (isSelected ? 100 : 0);

              return (
                <div
                  key={item.product_id}
                  className="absolute group"
                  style={{
                    left: item.x * scale,
                    top: item.y * scale,
                    width: item.width * scale,
                    height: item.height * scale,
                    zIndex,
                    touchAction: 'none',
                    cursor: dragRef.current?.itemIndex === origIndex ? 'grabbing' : 'grab',
                  }}
                  onPointerDown={(e) => handlePointerDown(e, origIndex, 'move')}
                  onClick={(e) => { e.stopPropagation(); setSelectedIndex(origIndex); }}
                >
                  <img
                    src={item.processedImageUrl}
                    alt={item.name || item.slot_type}
                    className="w-full h-full object-contain pointer-events-none select-none"
                    style={{ filter: 'drop-shadow(4px 6px 10px rgba(0,0,0,0.12))' }}
                    draggable={false}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('fetch-ibb-image')) {
                        target.src = `${proxyBase}${encodeURIComponent(item.processedImageUrl)}`;
                      }
                    }}
                  />

                  <span
                    className={`absolute -top-0.5 left-1/2 -translate-x-1/2 -translate-y-full px-1.5 py-0.5 text-[10px] font-medium rounded whitespace-nowrap transition-opacity ${
                      isSelected
                        ? 'bg-blue-600 text-white opacity-100'
                        : 'bg-black/50 text-white opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {SLOT_LABELS[item.slot_type] || item.slot_type}
                  </span>

                  {isSelected && (
                    <div className="absolute inset-0 border-2 border-blue-500 border-dashed rounded pointer-events-none" />
                  )}
                  {!isSelected && (
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-300/60 rounded pointer-events-none transition-colors" />
                  )}

                  {isSelected && (['tl', 'tr', 'bl', 'br'] as Corner[]).map(corner => (
                    <div
                      key={corner}
                      className="absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow hover:scale-125 transition-transform"
                      style={{
                        top: corner.startsWith('t') ? -8 : undefined,
                        bottom: corner.startsWith('b') ? -8 : undefined,
                        left: corner.endsWith('l') ? -8 : undefined,
                        right: corner.endsWith('r') ? -8 : undefined,
                        touchAction: 'none',
                        cursor: corner === 'tl' || corner === 'br' ? 'nwse-resize' : 'nesw-resize',
                      }}
                      onPointerDown={(e) => handlePointerDown(e, origIndex, 'resize', corner)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
        >
          <X size={18} />
          취소
        </button>
        <button
          onClick={() => onConfirm(items)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 rounded-lg font-medium transition-colors shadow-lg"
        >
          <Check size={18} />
          레이아웃 확정
        </button>
      </div>
    </div>
  );
}
