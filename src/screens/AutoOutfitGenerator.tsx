import { useState } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { generateOutfitsAutomatically, GeneratedOutfit } from '../utils/outfitGenerator';

interface AutoOutfitGeneratorProps {
  onClose: () => void;
  onGenerated: () => void;
}

const GENDER_OPTIONS = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
];

const BODY_TYPE_OPTIONS = [
  { value: 'rectangle', label: '사각형' },
  { value: 'inverted triangle', label: '역삼각형' },
  { value: 'triangle', label: '삼각형' },
  { value: 'oval', label: '타원형' },
  { value: 'hourglass', label: '모래시계' },
];

const VIBE_OPTIONS = [
  { value: 'ELEVATED_COOL', label: 'Elevated Cool' },
  { value: 'EFFORTLESS_NATURAL', label: 'Effortless Natural' },
  { value: 'ARTISTIC_MINIMAL', label: 'Artistic Minimal' },
  { value: 'RETRO_LUXE', label: 'Retro Luxe' },
  { value: 'SPORT_MODERN', label: 'Sport Modern' },
  { value: 'CREATIVE_LAYERED', label: 'Creative Layered' },
];

const SEASON_OPTIONS = [
  { value: 'spring', label: '봄' },
  { value: 'summer', label: '여름' },
  { value: 'fall', label: '가을' },
  { value: 'winter', label: '겨울' },
];

export default function AutoOutfitGenerator({ onClose, onGenerated }: AutoOutfitGeneratorProps) {
  const [gender, setGender] = useState('MALE');
  const [bodyType, setBodyType] = useState('rectangle');
  const [vibe, setVibe] = useState('ELEVATED_COOL');
  const [count, setCount] = useState(5);
  const [season, setSeason] = useState('');
  const [warmth, setWarmth] = useState('');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedOutfit[]>([]);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setResults([]);

    try {
      const targetWarmth = warmth ? parseInt(warmth) : undefined;
      const targetSeason = season || undefined;

      const generated = await generateOutfitsAutomatically({
        gender,
        bodyType,
        vibe,
        count,
        targetWarmth,
        targetSeason,
      });

      setResults(generated);
    } catch (err) {
      console.error('Generation error:', err);
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleComplete = () => {
    onGenerated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">자동 코디 생성</h2>
              <p className="text-sm text-gray-600">AI 매칭 엔진으로 최적의 코디를 자동 생성합니다</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {!results.length && !error && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  성별 <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {GENDER_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setGender(option.value)}
                      className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                        gender === option.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  체형 <span className="text-red-500">*</span>
                </label>
                <select
                  value={bodyType}
                  onChange={(e) => setBodyType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {BODY_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  스타일 <span className="text-red-500">*</span>
                </label>
                <select
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {VIBE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  생성 개수
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">1~20개의 코디를 생성할 수 있습니다</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    계절 (선택사항)
                  </label>
                  <select
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">전체</option>
                    {SEASON_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    보온성 (선택사항)
                  </label>
                  <select
                    value={warmth}
                    onChange={(e) => setWarmth(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">전체</option>
                    <option value="1">1 (가벼움)</option>
                    <option value="2">2</option>
                    <option value="3">3 (보통)</option>
                    <option value="4">4</option>
                    <option value="5">5 (따뜻함)</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">자동 생성 안내</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>AI 매칭 엔진이 6가지 기준으로 최적의 조합을 찾습니다</li>
                      <li>컬러 조화, 톤 일치, 패턴 밸런스, 격식 수준, 보온성, 계절 적합성</li>
                      <li>생성된 코디는 "pending_render" 상태로 저장됩니다</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg shadow-lg"
              >
                {generating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    코디 자동 생성
                  </>
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-900 mb-1">생성 실패</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setError('');
                  setResults([]);
                }}
                className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                다시 시도
              </button>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900 mb-1">생성 완료!</p>
                    <p className="text-sm text-green-700">
                      {results.length}개의 코디가 성공적으로 생성되었습니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-2">생성된 코디 목록</p>
                {results.map((result, idx) => (
                  <div
                    key={result.outfitId}
                    className="bg-white rounded-lg p-3 border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          코디 #{idx + 1}
                        </p>
                        <p className="text-xs text-gray-500">
                          {result.items.length}개 아이템 · 매칭 점수: {result.matchScore}점
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.items.map(item => (
                          <span
                            key={item.slot_type}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {item.slot_type}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setResults([]);
                    setError('');
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  더 생성하기
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  완료
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
