import { useState, useEffect, useRef } from 'react';
import { Move, Maximize2, RotateCcw, Check, X, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown } from 'lucide-react';
import type { EditorProductData } from '../utils/flatlayRenderer';

const SLOT_BASE_Z: Record<string, number> = {
  outer: 1, top: 2, mid: 3, bottom: 4, shoes: 5, bag: 6, accessory: 7, accessory_2: 8,
};

const SLOT_LABELS: Record<string, string> = {
  outer: 'Outer', top: 'Top', mid: 'Mid', bottom: 'Bottom',
  shoes: 'Shoes', bag: 'Bag', accessory: 'Acc', accessory_2: 'Acc 2',
};

function initZOrders(items: EditorProductData[]): EditorProductData[] {
  return items.map((item, i) => ({
    ...item,
    zOrder: item.zOrder ?? (SLOT_BASE_Z[item.slot_type] ?? (i + 1)),
  }));
}

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
  const [items, setItems] = useState(() => initZOrders(initialItems));
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
    setItems(initZOrders(initialItems));
    setSelectedIndex(null);
  };

  const bringForward = () => {
    if (selectedIndex === null) return;
    setItems(prev => {
      const sorted = [...prev].sort((a, b) => (a.zOrder ?? 0) - (b.zOrder ?? 0));
      const cur = prev[selectedIndex];
      const above = sorted.find(it => it.product_id !== cur.product_id && (it.zOrder ?? 0) > (cur.zOrder ?? 0));
      if (!above) return prev;
      const aboveZ = above.zOrder ?? 0;
      const curZ = cur.zOrder ?? 0;
      return prev.map(it => {
        if (it.product_id === cur.product_id) return { ...it, zOrder: aboveZ };
        if (it.product_id === above.product_id) return { ...it, zOrder: curZ };
        return it;
      });
    });
  };

  const sendBackward = () => {
    if (selectedIndex === null) return;
    setItems(prev => {
      const sorted = [...prev].sort((a, b) => (a.zOrder ?? 0) - (b.zOrder ?? 0));
      const cur = prev[selectedIndex];
      const below = [...sorted].reverse().find(it => it.product_id !== cur.product_id && (it.zOrder ?? 0) < (cur.zOrder ?? 0));
      if (!below) return prev;
      const belowZ = below.zOrder ?? 0;
      const curZ = cur.zOrder ?? 0;
      return prev.map(it => {
        if (it.product_id === cur.product_id) return { ...it, zOrder: belowZ };
        if (it.product_id === below.product_id) return { ...it, zOrder: curZ };
        return it;
      });
    });
  };

  const bringToFront = () => {
    if (selectedIndex === null) return;
    setItems(prev => {
      const maxZ = Math.max(...prev.map(it => it.zOrder ?? 0));
      const cur = prev[selectedIndex];
      if ((cur.zOrder ?? 0) === maxZ) return prev;
      return prev.map(it =>
        it.product_id === cur.product_id ? { ...it, zOrder: maxZ + 1 } : it
      );
    });
  };

  const sendToBack = () => {
    if (selectedIndex === null) return;
    setItems(prev => {
      const minZ = Math.min(...prev.map(it => it.zOrder ?? 0));
      const cur = prev[selectedIndex];
      if ((cur.zOrder ?? 0) === minZ) return prev;
      return prev.map(it =>
        it.product_id === cur.product_id ? { ...it, zOrder: minZ - 1 } : it
      );
    });
  };

  const proxyBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-ibb-image?url=`;

  const sortedItems = [...items]
    .map((item, origIndex) => ({ item, origIndex }))
    .sort((a, b) => (a.item.zOrder ?? 0) - (b.item.zOrder ?? 0));

  const selectedItem = selectedIndex !== null ? items[selectedIndex] : null;
  const zOrders = items.map(it => it.zOrder ?? 0);
  const maxZ = Math.max(...zOrders);
  const minZ = Math.min(...zOrders);
  const isAtFront = selectedItem !== null && (selectedItem.zOrder ?? 0) >= maxZ;
  const isAtBack = selectedItem !== null && (selectedItem.zOrder ?? 0) <= minZ;

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

      {selectedItem && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-xs font-medium text-blue-700 mr-1">
            {SLOT_LABELS[selectedItem.slot_type] || selectedItem.slot_type}
          </span>
          <span className="text-[10px] text-blue-400 mr-2">레이어 순서</span>
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={sendToBack}
              disabled={isAtBack}
              title="맨 뒤로"
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-white border border-blue-200 text-blue-600 hover:bg-blue-100"
            >
              <ChevronsDown size={13} />
              맨 뒤로
            </button>
            <button
              onClick={sendBackward}
              disabled={isAtBack}
              title="한 단계 뒤로"
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-white border border-blue-200 text-blue-600 hover:bg-blue-100"
            >
              <ArrowDown size={13} />
              뒤로
            </button>
            <button
              onClick={bringForward}
              disabled={isAtFront}
              title="한 단계 앞으로"
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-white border border-blue-200 text-blue-600 hover:bg-blue-100"
            >
              <ArrowUp size={13} />
              앞으로
            </button>
            <button
              onClick={bringToFront}
              disabled={isAtFront}
              title="맨 앞으로"
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-white border border-blue-200 text-blue-600 hover:bg-blue-100"
            >
              <ChevronsUp size={13} />
              맨 앞으로
            </button>
          </div>
        </div>
      )}
      {!selectedItem && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="text-xs text-gray-400">아이템을 선택하면 레이어 순서를 조정할 수 있습니다</span>
        </div>
      )}

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
              const zIndex = (item.zOrder ?? 0) * 10 + (isSelected ? 1000 : 0);

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
