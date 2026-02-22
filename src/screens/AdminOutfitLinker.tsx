import { useState, useEffect, useRef } from 'react';
import { Outfit } from '../data/outfits';
import { supabase } from '../utils/supabase';
import OutfitProductLinker from './OutfitProductLinker';
import AutoOutfitGenerator from './AutoOutfitGenerator';
import { Sparkles, Trash2, CheckSquare, Square, XSquare, ChevronDown } from 'lucide-react';

const SEASON_LABELS: Record<string, string> = {
  spring: '봄',
  summer: '여름',
  fall: '가을',
  winter: '겨울',
};

const ALL_SEASONS = ['spring', 'summer', 'fall', 'winter'];

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
  } catch { /* ignore */ }
}

export default function AdminOutfitLinker() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOutfitLinker, setShowOutfitLinker] = useState(false);
  const [showAutoGenerator, setShowAutoGenerator] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);

  const savedFilters = loadSavedOutfitFilters();
  const [outfitFilterGender, setOutfitFilterGenderRaw] = useState(savedFilters?.outfitFilterGender ?? '');
  const [outfitFilterBodyType, setOutfitFilterBodyTypeRaw] = useState(savedFilters?.outfitFilterBodyType ?? '');
  const [outfitFilterVibe, setOutfitFilterVibeRaw] = useState(savedFilters?.outfitFilterVibe ?? '');
  const [outfitFilterSeason, setOutfitFilterSeasonRaw] = useState(savedFilters?.outfitFilterSeason ?? '');

  const setOutfitFilterGender = (v: string) => { setOutfitFilterGenderRaw(v); saveOutfitFilters({ outfitFilterGender: v }); };
  const setOutfitFilterBodyType = (v: string) => { setOutfitFilterBodyTypeRaw(v); saveOutfitFilters({ outfitFilterBodyType: v }); };
  const setOutfitFilterVibe = (v: string) => { setOutfitFilterVibeRaw(v); saveOutfitFilters({ outfitFilterVibe: v }); };
  const setOutfitFilterSeason = (v: string) => { setOutfitFilterSeasonRaw(v); saveOutfitFilters({ outfitFilterSeason: v }); };

  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState<string | null>(null);
  const [seasonDropdownPos, setSeasonDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const seasonBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadOutfits();
  }, []);

  const loadOutfits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('outfits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const outfitsData: Outfit[] = data?.map(row => ({
        id: row.id,
        gender: row.gender,
        body_type: row.body_type,
        vibe: row.vibe,
        season: row.season || [],
        image_url_flatlay: row.image_url_flatlay || '',
        image_url_flatlay_clean: row.image_url_flatlay_clean || '',
        image_url_on_model: row.image_url_on_model || '',
        insight_text: row['AI insight'] || '',
        flatlay_pins: row.flatlay_pins || [],
        on_model_pins: row.on_model_pins || [],
        tpo: row.tpo || '',
        status: row.status || '',
        prompt_flatlay: row.prompt_flatlay || '',
        created_at: row.created_at || '',
        updated_at: row.updated_at || '',
        items: [],
      })) || [];

      setOutfits(outfitsData);
    } catch (error) {
      console.error('Failed to load outfits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkOutfit = (outfit: Outfit) => {
    setSelectedOutfit(outfit);
    setShowOutfitLinker(true);
  };

  const handleLinkerClose = () => {
    setShowOutfitLinker(false);
    setSelectedOutfit(null);
  };

  const handleLinksUpdated = () => {
    loadOutfits();
  };

  const handleOutfitSeasonToggle = async (outfitId: string, season: string, currentSeasons: string[]) => {
    const newSeasons = currentSeasons.includes(season)
      ? currentSeasons.filter(s => s !== season)
      : [...currentSeasons, season];

    const { error } = await supabase
      .from('outfits')
      .update({ season: newSeasons })
      .eq('id', outfitId);

    if (!error) {
      setOutfits(prev => prev.map(o => o.id === outfitId ? { ...o, season: newSeasons } : o));
    }
  };

  const handleDeleteOutfit = async (outfitId: string) => {
    if (!confirm('이 코디를 삭제하시겠습니까? 연결된 제품 정보도 함께 삭제됩니다.')) return;

    setLoading(true);
    try {
      await supabase.from('outfit_items').delete().eq('outfit_id', outfitId);
      const { error } = await supabase.from('outfits').delete().eq('id', outfitId);
      if (error) throw error;
      await loadOutfits();
      alert('코디가 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete outfit:', error);
      alert('코디 삭제 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
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
    if (selectedOutfitIds.size === filteredOutfits.length) {
      setSelectedOutfitIds(new Set());
    } else {
      setSelectedOutfitIds(new Set(filteredOutfits.map(o => o.id)));
    }
  };

  const handleBulkDeleteOutfits = async () => {
    const count = selectedOutfitIds.size;
    if (count === 0) return;
    if (!confirm(`선택한 ${count}개의 코디를 삭제하시겠습니까? 연결된 제품 정보도 함께 삭제됩니다.`)) return;

    setLoading(true);
    try {
      const ids = Array.from(selectedOutfitIds);
      await supabase.from('outfit_items').delete().in('outfit_id', ids);
      const { error } = await supabase.from('outfits').delete().in('id', ids);
      if (error) throw error;
      setSelectedOutfitIds(new Set());
      await loadOutfits();
      alert(`${count}개 코디가 삭제되었습니다.`);
    } catch (error) {
      console.error('Bulk delete failed:', error);
      alert('삭제 실패: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filteredOutfits = outfits.filter(outfit => {
    if (outfitFilterGender && outfit.gender !== outfitFilterGender) return false;
    if (outfitFilterBodyType && outfit.body_type !== outfitFilterBodyType) return false;
    if (outfitFilterVibe && outfit.vibe !== outfitFilterVibe) return false;
    if (outfitFilterSeason) {
      const seasons = outfit.season || [];
      if (!seasons.includes(outfitFilterSeason)) return false;
    }
    return true;
  });

  if (loading) {
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
                코디 목록 ({filteredOutfits.length}개 / 전체 {outfits.length}개)
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

          {filteredOutfits.length > 0 && (
            <div className="mb-4 flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
              <button
                onClick={toggleSelectAllOutfits}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                {selectedOutfitIds.size === filteredOutfits.length && filteredOutfits.length > 0 ? (
                  <CheckSquare size={18} className="text-blue-600" />
                ) : (
                  <Square size={18} />
                )}
                {selectedOutfitIds.size === filteredOutfits.length && filteredOutfits.length > 0
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

          {filteredOutfits.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {outfits.length === 0 ? '등록된 코디가 없습니다' : '검색 결과가 없습니다'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOutfits.map((outfit) => (
                <div
                  key={outfit.id}
                  className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all border-2 overflow-hidden relative ${
                    selectedOutfitIds.has(outfit.id)
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => toggleOutfitSelection(outfit.id)}
                    className="absolute top-2 left-2 z-10"
                  >
                    {selectedOutfitIds.has(outfit.id) ? (
                      <CheckSquare size={22} className="text-blue-600 drop-shadow-md" />
                    ) : (
                      <Square size={22} className="text-white drop-shadow-md" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteOutfit(outfit.id)}
                    className="absolute top-2 right-2 z-10 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-md"
                    title="코디 삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                  {outfit.image_url_flatlay ? (
                    <img
                      src={outfit.image_url_flatlay}
                      alt={`${outfit.gender} - ${outfit.vibe}`}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/400x300?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400">이미지 없음</span>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="text-sm text-gray-600 mb-2">
                      {outfit.gender} · {outfit.body_type} · {outfit.vibe}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                      연결된 제품: {outfit.items?.length || 0}개 · {outfit.status}
                    </div>
                    <div className="relative mb-3">
                      <button
                        ref={el => {
                          if (el) seasonBtnRefs.current.set(outfit.id, el);
                          else seasonBtnRefs.current.delete(outfit.id);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (seasonDropdownOpen === outfit.id) {
                            setSeasonDropdownOpen(null);
                            setSeasonDropdownPos(null);
                          } else {
                            const btn = seasonBtnRefs.current.get(outfit.id);
                            if (btn) {
                              const rect = btn.getBoundingClientRect();
                              setSeasonDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
                            }
                            setSeasonDropdownOpen(outfit.id);
                          }
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:border-gray-300 bg-gray-50 hover:bg-white transition-colors"
                      >
                        <span>
                          {(outfit.season || []).length === 0
                            ? '계절 미설정'
                            : (outfit.season || []).map(s => SEASON_LABELS[s] || s).join(' · ')}
                        </span>
                        <ChevronDown size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => handleLinkOutfit(outfit)}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      제품 연결
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
            loadOutfits();
            setShowAutoGenerator(false);
          }}
        />
      )}

      {seasonDropdownOpen && seasonDropdownPos && (() => {
        const outfit = outfits.find(o => o.id === seasonDropdownOpen);
        if (!outfit) return null;
        return (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => { setSeasonDropdownOpen(null); setSeasonDropdownPos(null); }}
            />
            <div
              className="fixed z-40 bg-white border border-gray-200 rounded-lg shadow-xl p-2"
              style={{ top: seasonDropdownPos.top, left: seasonDropdownPos.left, width: seasonDropdownPos.width }}
            >
              {ALL_SEASONS.map(s => (
                <button
                  key={s}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOutfitSeasonToggle(outfit.id, s, outfit.season || []);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    (outfit.season || []).includes(s)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {SEASON_LABELS[s]}
                </button>
              ))}
            </div>
          </>
        );
      })()}
    </div>
  );
}
