import { useState, useEffect, useCallback, useRef } from 'react';
import { Outfit } from '../data/outfits';
import { supabase } from '../utils/supabase';
import OutfitProductLinker from './OutfitProductLinker';
import AutoOutfitGenerator from './AutoOutfitGenerator';
import { outfitWarmthToTempRange } from '../utils/weather';
import { Sparkles, Trash2, CheckSquare, Square, XSquare, Link2, Thermometer, Snowflake, Sun, Leaf, Wind, Loader2, Dna } from 'lucide-react';

const SEASON_LABELS: Record<string, string> = {
  spring: '봄',
  summer: '여름',
  fall: '가을',
  winter: '겨울',
};

const PAGE_SIZE = 15;

const OUTFIT_FILTER_KEY = 'admin_outfit_filters';

function loadSavedOutfitFilters() {
  try {
    const v = sessionStorage.getItem(OUTFIT_FILTER_KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

function saveOutfitFilters(updates: Partial<{ outfitFilterGender: string; outfitFilterBodyType: string; outfitFilterVibe: string; outfitFilterSeason: string }>) {
  try {
    const current = loadSavedOutfitFilters() || {};
    sessionStorage.setItem(OUTFIT_FILTER_KEY, JSON.stringify({ ...current, ...updates }));
  } catch { }
}

interface OutfitWithMeta extends Outfit {
  avg_warmth?: number;
  temp_range_f?: { min: number; max: number };
  auto_seasons?: string[];
  look_number?: number;
  look_key?: string;
  item_count?: number;
}

const warmthToTempRangeF = outfitWarmthToTempRange;

const OUTFIT_LIST_COLS = 'id,gender,body_type,vibe,season,look_key,image_url_flatlay,image_url_on_model,tpo,status,created_at,updated_at';

function warmthToSeasons(warmth: number): string[] {
  if (warmth >= 3.8) return ['winter'];
  if (warmth >= 3.0) return ['winter', 'fall'];
  if (warmth >= 2.2) return ['fall', 'spring'];
  return ['summer', 'spring'];
}

function getWarmthLabel(warmth: number): string {
  if (warmth >= 3.8) return '매우 두꺼움';
  if (warmth >= 3.0) return '두꺼움';
  if (warmth >= 2.2) return '보통';
  if (warmth >= 1.6) return '얇음';
  return '매우 얇음';
}

function getWarmthColor(warmth: number): string {
  if (warmth >= 3.8) return 'bg-blue-100 text-blue-700';
  if (warmth >= 3.0) return 'bg-sky-100 text-sky-700';
  if (warmth >= 2.2) return 'bg-amber-50 text-amber-600';
  if (warmth >= 1.6) return 'bg-orange-100 text-orange-600';
  return 'bg-red-100 text-red-600';
}

function SeasonIcon({ season, size = 10 }: { season: string; size?: number }) {
  if (season === 'winter') return <Snowflake size={size} className="text-blue-500" />;
  if (season === 'summer') return <Sun size={size} className="text-amber-500" />;
  if (season === 'fall') return <Leaf size={size} className="text-orange-500" />;
  return <Wind size={size} className="text-green-500" />;
}

async function fetchOutfitPage(
  from: number,
  to: number,
  filters: { gender: string; bodyType: string; vibe: string; season: string }
): Promise<{ data: OutfitWithMeta[]; count: number }> {
  let query = supabase
    .from('outfits')
    .select(OUTFIT_LIST_COLS, { count: 'estimated' })
    .order('created_at', { ascending: false });

  if (filters.gender) query = query.eq('gender', filters.gender);
  if (filters.bodyType) query = query.eq('body_type', filters.bodyType);
  if (filters.vibe) query = query.eq('vibe', filters.vibe);

  query = query.range(from, to);

  const outfitsResult = await query;
  if (outfitsResult.error) throw outfitsResult.error;

  const rawOutfits = outfitsResult.data || [];
  const totalCount = outfitsResult.count ?? 0;

  if (rawOutfits.length === 0) return { data: [], count: totalCount };

  const outfitIds = rawOutfits.map((o: any) => o.id);

  const warmthResult = await supabase.rpc('get_outfit_warmth_batch', { outfit_ids: outfitIds });
  const warmthMap: Record<string, { avg_warmth: number | null; item_count: number }> = {};
  if (warmthResult.data) {
    for (const row of warmthResult.data) {
      warmthMap[row.outfit_id] = { avg_warmth: row.avg_warmth, item_count: row.item_count };
    }
  }

  const mapped: OutfitWithMeta[] = rawOutfits.map((row: any) => {
    const w = warmthMap[row.id];
    const avgWarmth = w?.avg_warmth != null ? Number(w.avg_warmth) : undefined;
    const autoSeasons = avgWarmth !== undefined ? warmthToSeasons(avgWarmth) : [];

    if (filters.season && !autoSeasons.includes(filters.season)) return null;

    return {
      id: row.id,
      gender: row.gender,
      body_type: row.body_type,
      vibe: row.vibe,
      season: row.season || [],
      look_key: row.look_key || undefined,
      image_url_flatlay: row.image_url_flatlay || '',
      image_url_flatlay_clean: '',
      image_url_on_model: row.image_url_on_model || '',
      insight_text: '',
      flatlay_pins: [],
      on_model_pins: [],
      tpo: row.tpo || '',
      status: row.status || '',
      prompt_flatlay: '',
      created_at: row.created_at || '',
      updated_at: row.updated_at || '',
      items: [],
      avg_warmth: avgWarmth,
      temp_range_f: avgWarmth !== undefined ? warmthToTempRangeF(avgWarmth) : undefined,
      auto_seasons: autoSeasons,
      item_count: w?.item_count ?? 0,
    };
  }).filter(Boolean) as OutfitWithMeta[];

  return { data: mapped, count: totalCount, rawCount: rawOutfits.length };
}

export default function AdminOutfitLinker() {
  const [outfits, setOutfits] = useState<OutfitWithMeta[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showOutfitLinker, setShowOutfitLinker] = useState(false);
  const [showAutoGenerator, setShowAutoGenerator] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const filterVersionRef = useRef(0);
  const outfitsLengthRef = useRef(0);

  const savedFilters = loadSavedOutfitFilters();
  const [outfitFilterGender, setOutfitFilterGenderRaw] = useState(savedFilters?.outfitFilterGender ?? '');
  const [outfitFilterBodyType, setOutfitFilterBodyTypeRaw] = useState(savedFilters?.outfitFilterBodyType ?? '');
  const [outfitFilterVibe, setOutfitFilterVibeRaw] = useState(savedFilters?.outfitFilterVibe ?? '');
  const [outfitFilterSeason, setOutfitFilterSeasonRaw] = useState(savedFilters?.outfitFilterSeason ?? '');

  const currentFilters = {
    gender: outfitFilterGender,
    bodyType: outfitFilterBodyType,
    vibe: outfitFilterVibe,
    season: outfitFilterSeason,
  };
  const filtersRef = useRef(currentFilters);
  filtersRef.current = currentFilters;

  const setOutfitFilterGender = (v: string) => { setOutfitFilterGenderRaw(v); saveOutfitFilters({ outfitFilterGender: v }); };
  const setOutfitFilterBodyType = (v: string) => { setOutfitFilterBodyTypeRaw(v); saveOutfitFilters({ outfitFilterBodyType: v }); };
  const setOutfitFilterVibe = (v: string) => { setOutfitFilterVibeRaw(v); saveOutfitFilters({ outfitFilterVibe: v }); };
  const setOutfitFilterSeason = (v: string) => { setOutfitFilterSeasonRaw(v); saveOutfitFilters({ outfitFilterSeason: v }); };

  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);

  const dbOffsetRef = useRef(0);

  const loadInitial = useCallback(async () => {
    const version = ++filterVersionRef.current;
    setInitialLoading(true);
    setOutfits([]);
    outfitsLengthRef.current = 0;
    dbOffsetRef.current = 0;
    hasMoreRef.current = false;
    setHasMore(false);
    try {
      const { data, count, rawCount } = await fetchOutfitPage(0, PAGE_SIZE - 1, filtersRef.current);
      if (version !== filterVersionRef.current) return;
      setOutfits(data);
      outfitsLengthRef.current = data.length;
      dbOffsetRef.current = rawCount;
      setTotalCount(count);
      const more = rawCount >= PAGE_SIZE;
      hasMoreRef.current = more;
      setHasMore(more);
    } catch (error) {
      if (version !== filterVersionRef.current) return;
      console.error('Failed to load outfits:', error);
    } finally {
      if (version === filterVersionRef.current) setInitialLoading(false);
    }
  }, [outfitFilterGender, outfitFilterBodyType, outfitFilterVibe, outfitFilterSeason]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    const version = filterVersionRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const from = dbOffsetRef.current;
      const to = from + PAGE_SIZE - 1;
      const { data, count, rawCount } = await fetchOutfitPage(from, to, filtersRef.current);
      if (version !== filterVersionRef.current) return;
      setOutfits(prev => [...prev, ...data]);
      outfitsLengthRef.current += data.length;
      dbOffsetRef.current = from + rawCount;
      setTotalCount(count);
      const more = rawCount >= PAGE_SIZE;
      hasMoreRef.current = more;
      setHasMore(more);
    } catch (error) {
      if (version !== filterVersionRef.current) return;
      console.error('Failed to load more outfits:', error);
    } finally {
      loadingMoreRef.current = false;
      if (version === filterVersionRef.current) setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const handleScroll = () => {
      if (!hasMoreRef.current || loadingMoreRef.current) return;
      const sentinel = sentinelRef.current;
      if (!sentinel) return;
      const rect = sentinel.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 600) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  const reloadCurrent = () => loadInitial();

  const handleLinkOutfit = (outfit: Outfit) => {
    setSelectedOutfit(outfit);
    setShowOutfitLinker(true);
  };

  const handleLinkerClose = () => {
    setShowOutfitLinker(false);
    setSelectedOutfit(null);
  };

  const handleLinksUpdated = () => {
    loadInitial();
  };

  const handleDeleteOutfit = async (outfitId: string) => {
    if (!confirm('이 코디를 삭제하시겠습니까? 연결된 제품 정보도 함께 삭제됩니다.')) return;
    try {
      await supabase.from('outfit_items').delete().eq('outfit_id', outfitId);
      const { error } = await supabase.from('outfits').delete().eq('id', outfitId);
      if (error) throw error;
      setOutfits(prev => prev.filter(o => o.id !== outfitId));
      setTotalCount(prev => prev - 1);
      alert('코디가 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete outfit:', error);
      alert('코디 삭제 실패: ' + (error as Error).message);
    }
  };

  const toggleOutfitSelection = (outfitId: string) => {
    setSelectedOutfitIds(prev => {
      const next = new Set(prev);
      if (next.has(outfitId)) next.delete(outfitId);
      else next.add(outfitId);
      return next;
    });
  };

  const toggleSelectAllOutfits = () => {
    if (selectedOutfitIds.size === outfits.length) {
      setSelectedOutfitIds(new Set());
    } else {
      setSelectedOutfitIds(new Set(outfits.map(o => o.id)));
    }
  };

  const handleBulkDeleteOutfits = async () => {
    const count = selectedOutfitIds.size;
    if (count === 0) return;
    if (!confirm(`선택한 ${count}개의 코디를 삭제하시겠습니까? 연결된 제품 정보도 함께 삭제됩니다.`)) return;
    try {
      const ids = Array.from(selectedOutfitIds);
      await supabase.from('outfit_items').delete().in('outfit_id', ids);
      const { error } = await supabase.from('outfits').delete().in('id', ids);
      if (error) throw error;
      setSelectedOutfitIds(new Set());
      setOutfits(prev => prev.filter(o => !ids.includes(o.id)));
      setTotalCount(prev => prev - count);
      alert(`${count}개 코디가 삭제되었습니다.`);
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert('삭제 실패: ' + (error as Error).message);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">코디 연결</h1>
          <p className="text-gray-600">코디를 선택하여 제품을 연결하세요</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">성별</label>
              <select
                value={outfitFilterGender}
                onChange={(e) => setOutfitFilterGender(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">체형</label>
              <select
                value={outfitFilterBodyType}
                onChange={(e) => setOutfitFilterBodyType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="slim">Slim</option>
                <option value="regular">Regular</option>
                <option value="plus-size">Plus-size</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">분위기</label>
              <select
                value={outfitFilterVibe}
                onChange={(e) => setOutfitFilterVibe(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="ELEVATED_COOL">Elevated Cool</option>
                <option value="EFFORTLESS_NATURAL">Effortless Natural</option>
                <option value="RETRO_LUXE">Retro Luxe</option>
                <option value="SPORT_MODERN">Sport Modern</option>
                <option value="CREATIVE_LAYERED">Creative Layered</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">계절</label>
              <select
                value={outfitFilterSeason}
                onChange={(e) => setOutfitFilterSeason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="spring">봄</option>
                <option value="summer">여름</option>
                <option value="fall">가을</option>
                <option value="winter">겨울</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                코디 목록
                {outfits.length > 0 && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    {outfits.length} / {totalCount}개 로드됨
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-600">코디를 선택하여 제품을 연결하세요</p>
            </div>
            <button
              onClick={() => setShowAutoGenerator(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 shadow-md"
            >
              <Sparkles size={18} />
              자동 생성
            </button>
          </div>

          {outfits.length > 0 && (
            <div className="mb-4 flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
              <button
                onClick={toggleSelectAllOutfits}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                {selectedOutfitIds.size === outfits.length && outfits.length > 0 ? (
                  <CheckSquare size={18} className="text-blue-600" />
                ) : (
                  <Square size={18} />
                )}
                {selectedOutfitIds.size === outfits.length && outfits.length > 0
                  ? '전체 해제'
                  : '전체 선택'}
              </button>
              {selectedOutfitIds.size > 0 && (
                <>
                  <span className="text-sm text-gray-500">{selectedOutfitIds.size}개 선택됨</span>
                  <button
                    onClick={() => setSelectedOutfitIds(new Set())}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <XSquare size={16} />
                    선택 해제
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={handleBulkDeleteOutfits}
                    className="flex items-center gap-2 bg-red-500 text-white px-4 py-1.5 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium shadow-sm"
                  >
                    <Trash2 size={16} />
                    {selectedOutfitIds.size}개 삭제
                  </button>
                </>
              )}
            </div>
          )}

          {outfits.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {totalCount === 0 ? '등록된 코디가 없습니다' : '검색 결과가 없습니다'}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {outfits.map((outfit) => (
                  <div
                    key={outfit.id}
                    className={`group relative bg-white rounded-lg overflow-hidden transition-all duration-200 border-2 ${
                      selectedOutfitIds.has(outfit.id)
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                    }`}
                  >
                    <div className="relative aspect-square bg-gray-100">
                      {outfit.image_url_flatlay ? (
                        <img
                          src={outfit.image_url_flatlay}
                          alt={`${outfit.gender} - ${outfit.vibe}`}
                          className="absolute inset-0 w-full h-full object-contain p-1"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/300x300?text=No+Image';
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">이미지 없음</span>
                        </div>
                      )}

                      <button
                        onClick={() => toggleOutfitSelection(outfit.id)}
                        className="absolute top-1.5 left-1.5 z-10"
                      >
                        {selectedOutfitIds.has(outfit.id) ? (
                          <CheckSquare size={20} className="text-blue-600 drop-shadow-md" />
                        ) : (
                          <Square size={20} className="text-white/80 drop-shadow-md group-hover:text-white" />
                        )}
                      </button>

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleLinkOutfit(outfit)}
                            className="p-2 bg-white rounded-full text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
                            title="제품 연결"
                          >
                            <Link2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteOutfit(outfit.id)}
                            className="p-2 bg-white rounded-full text-red-700 hover:bg-red-50 transition-colors shadow-sm"
                            title="삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="px-2 pt-1.5 pb-2 space-y-1.5">
                      <div className="flex items-center gap-1">
                        <p className="text-[11px] text-gray-700 font-medium leading-tight truncate flex-1">
                          {outfit.gender} · {outfit.body_type} · {outfit.vibe}
                        </p>
                        {outfit.look_key && (
                          <a
                            href={`#admin-style-dna`}
                            className={`shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold ${
                              outfit.look_key === 'A' ? 'bg-sky-100 text-sky-600' :
                              outfit.look_key === 'B' ? 'bg-emerald-100 text-emerald-600' :
                              'bg-rose-100 text-rose-600'
                            }`}
                            title="View in DNA Lab"
                          >
                            <Dna size={8} />
                            {outfit.look_key}
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400">
                          {outfit.item_count ?? 0}개 · {outfit.status || '-'}
                        </span>
                      </div>

                      {outfit.avg_warmth !== undefined && (
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium w-fit ${getWarmthColor(outfit.avg_warmth)}`}>
                          <Thermometer size={9} />
                          <span>보온 {outfit.avg_warmth.toFixed(1)} · {getWarmthLabel(outfit.avg_warmth)}</span>
                        </div>
                      )}

                      {outfit.temp_range_f && (
                        <div className="flex items-center gap-1 text-[9px] text-gray-500">
                          <span className="font-medium text-gray-600">{outfit.temp_range_f.min}–{outfit.temp_range_f.max}°F</span>
                          <span className="text-gray-300">|</span>
                          <div className="flex items-center gap-0.5">
                            {(outfit.auto_seasons || []).map(s => (
                              <span key={s} className="flex items-center gap-0.5">
                                <SeasonIcon season={s} size={9} />
                                <span>{SEASON_LABELS[s]}</span>
                              </span>
                            ))}
                            {(outfit.auto_seasons || []).length === 0 && (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </div>
                      )}

                      {outfit.avg_warmth === undefined && (
                        <div className="flex items-center gap-1 text-[9px] text-gray-400 italic">
                          <Thermometer size={9} />
                          <span>제품 연결 후 계산</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div ref={sentinelRef} className="h-1" />

              {loadingMore && (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 size={18} className="animate-spin text-blue-500" />
                  <span className="text-sm text-gray-500">더 불러오는 중...</span>
                </div>
              )}

              {!hasMore && outfits.length > 0 && outfits.length >= PAGE_SIZE && (
                <div className="text-center py-4 text-sm text-gray-400">
                  모든 코디를 불러왔습니다
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showOutfitLinker && selectedOutfit && (
        <OutfitProductLinker
          outfit={selectedOutfit}
          onClose={handleLinkerClose}
          onLinksUpdated={handleLinksUpdated}
        />
      )}

      {showAutoGenerator && (
        <AutoOutfitGenerator
          onClose={() => setShowAutoGenerator(false)}
          onGenerated={() => {
            reloadCurrent();
            setShowAutoGenerator(false);
          }}
        />
      )}
    </div>
  );
}
