import { useState, useRef } from 'react';
import { uploadProductBlob, uploadProductImage, validateImageFile } from '../utils/imageUpload';
import { detectItemsInPhoto, extractProductImage } from '../utils/productExtractor';
import { analyzeFashionImage } from '../utils/fashionAnalyzer';
import { supabase } from '../utils/supabase';
import { compressImageToTarget, downloadBlob } from '../utils/imageCompression';
import type { DetectedItem } from '../utils/productExtractor';
import {
  Upload,
  Loader2,
  ScanSearch,
  Scissors,
  Check,
  X,
  Download,
  Save,
  ArrowLeft,
  Image as ImageIcon,
  AlertCircle,
  Sparkles,
  Package,
} from 'lucide-react';

type ExtractionStatus = 'idle' | 'extracting' | 'done' | 'error';

interface ExtractedItemState extends DetectedItem {
  status: ExtractionStatus;
  extractedImageUrl?: string;
  saved?: boolean;
  saving?: boolean;
  downloading?: boolean;
  error?: string;
}

const SLOT_LABELS: Record<string, string> = {
  outer: '아우터',
  mid: '미드레이어',
  top: '상의',
  bottom: '하의',
  shoes: '신발',
  bag: '가방',
  accessory: '액세서리',
};

const SLOT_COLORS: Record<string, string> = {
  outer: 'bg-amber-100 text-amber-800 border-amber-300',
  mid: 'bg-teal-100 text-teal-800 border-teal-300',
  top: 'bg-blue-100 text-blue-800 border-blue-300',
  bottom: 'bg-slate-100 text-slate-800 border-slate-300',
  shoes: 'bg-orange-100 text-orange-800 border-orange-300',
  bag: 'bg-rose-100 text-rose-800 border-rose-300',
  accessory: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

export default function ModelProductExtractor({ onBack }: { onBack: () => void }) {
  const [sourceImageUrl, setSourceImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [items, setItems] = useState<ExtractedItemState[]>([]);
  const [phase, setPhase] = useState<'upload' | 'detected' | 'extracting'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    setUploading(true);
    const result = await uploadProductImage(file);
    if (result.success && result.url) {
      setSourceImageUrl(result.url);
    } else {
      alert(result.error || '업로드 실패');
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    setSourceImageUrl(urlInput.trim());
  };

  const handleDetect = async () => {
    if (!sourceImageUrl) return;

    setDetecting(true);
    try {
      const detected = await detectItemsInPhoto(sourceImageUrl);
      setItems(detected.map((item) => ({ ...item, status: 'idle' as ExtractionStatus })));
      setPhase('detected');
    } catch (error) {
      alert('아이템 감지 실패: ' + (error as Error).message);
    } finally {
      setDetecting(false);
    }
  };

  const handleExtractSingle = async (index: number) => {
    const item = items[index];
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, status: 'extracting' } : it))
    );

    try {
      const result = await extractProductImage(sourceImageUrl, item.slot, item.label);
      setItems((prev) =>
        prev.map((it, i) =>
          i === index
            ? { ...it, status: 'done', extractedImageUrl: result.imageUrl }
            : it
        )
      );
    } catch (error) {
      setItems((prev) =>
        prev.map((it, i) =>
          i === index
            ? { ...it, status: 'error', error: (error as Error).message }
            : it
        )
      );
    }
  };

  const handleExtractAll = async () => {
    setPhase('extracting');
    for (let i = 0; i < items.length; i++) {
      if (items[i].status === 'done') continue;
      await handleExtractSingle(i);
    }
  };

  const handleCompressAndSave = async (index: number) => {
    const item = items[index];
    if (!item.extractedImageUrl) return;

    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, saving: true } : it))
    );

    try {
      const compressed = await compressImageToTarget(item.extractedImageUrl, 500, 1200, 1200);

      const filename = `${item.label.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_compressed.webp`;
      downloadBlob(compressed.blob, filename);

      const uploadResult = await uploadProductBlob(compressed.blob, 'webp');
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || '압축 이미지 업로드 실패');
      }
      const compressedImageUrl = uploadResult.url;

      let analysisData: Record<string, unknown> = {};
      try {
        const analysis = await analyzeFashionImage(compressedImageUrl);
        const categoryMap: Record<string, string> = {
          '상의': 'top', '하의': 'bottom', '아우터': 'outer',
          '미드레이어': 'mid', '신발': 'shoes', '가방': 'bag', '액세서리': 'accessory', '넥타이': 'accessory',
        };
        const genderMap: Record<string, string> = {
          '남성': 'MALE', '여성': 'FEMALE', '공용': 'UNISEX',
        };
        analysisData = {
          category: categoryMap[analysis.category] || item.slot,
          gender: genderMap[analysis.gender] || 'UNISEX',
          color: analysis.color || item.color,
          color_family: analysis.color_family || '',
          color_tone: analysis.color_tone || '',
          sub_category: analysis.sub_category || '',
          pattern: analysis.pattern || '',
          material: analysis.material || '',
          silhouette: analysis.silhouette || '',
          vibe: analysis.vibe || [],
          season: analysis.season || [],
          formality: analysis.formality || 3,
          warmth: analysis.warmth || 3,
        };
      } catch {
        analysisData = { category: item.slot, gender: 'UNISEX', color: item.color };
      }

      const { error } = await supabase.from('products').insert([{
        name: item.label,
        brand: '',
        image_url: compressedImageUrl,
        nobg_image_url: item.extractedImageUrl,
        stock_status: 'in_stock',
        body_type: [],
        ...analysisData,
      }]);

      if (error) throw error;

      const sizeKB = (compressed.size / 1024).toFixed(1);
      const originalSizeKB = (compressed.originalSize / 1024).toFixed(1);

      setItems((prev) =>
        prev.map((it, i) => (i === index ? { ...it, saving: false, saved: true } : it))
      );

      alert(`완료!\n압축: ${originalSizeKB}KB → ${sizeKB}KB\n다운로드 + 제품 저장 완료`);
    } catch (error) {
      alert('처리 실패: ' + (error as Error).message);
      setItems((prev) =>
        prev.map((it, i) => (i === index ? { ...it, saving: false } : it))
      );
    }
  };

  const handleReset = () => {
    setSourceImageUrl('');
    setUrlInput('');
    setItems([]);
    setPhase('upload');
  };

  const doneCount = items.filter((i) => i.status === 'done').length;
  const extractingCount = items.filter((i) => i.status === 'extracting').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">관리자로 돌아가기</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <Scissors size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">제품 누끼 추출</h1>
              <p className="text-sm text-gray-500">
                모델 착용 사진에서 개별 제품을 감지하고 누끼컷으로 추출합니다
              </p>
            </div>
          </div>
        </div>

        {phase === 'upload' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Upload size={20} className="text-blue-600" />
                  모델 착용 사진 업로드
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  모델이 옷을 입고 있는 사진을 업로드하면 AI가 각 제품을 감지합니다
                </p>
              </div>

              <div className="p-6 space-y-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 size={40} className="text-blue-600 animate-spin" />
                      <span className="text-blue-600 font-medium">업로드 중...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <ImageIcon size={28} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <div>
                        <p className="text-gray-700 font-medium">클릭하여 이미지 선택</p>
                        <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP (최대 5MB)</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-sm text-gray-400">또는 URL 입력</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/model-photo.jpg"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={handleUrlSubmit}
                    disabled={!urlInput.trim()}
                    className="px-5 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>

            {sourceImageUrl && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">업로드된 이미지</h3>
                  <button
                    onClick={handleReset}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    다시 선택
                  </button>
                </div>
                <div className="p-6 flex flex-col items-center gap-6">
                  <div className="relative max-w-sm">
                    <img
                      src={sourceImageUrl}
                      alt="Model photo"
                      className="rounded-xl shadow-md max-h-[500px] object-contain"
                    />
                  </div>
                  <button
                    onClick={handleDetect}
                    disabled={detecting}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 font-medium shadow-lg shadow-blue-200 transition-all"
                  >
                    {detecting ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        AI가 아이템을 감지하는 중...
                      </>
                    ) : (
                      <>
                        <ScanSearch size={20} />
                        AI 아이템 감지 시작
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {(phase === 'detected' || phase === 'extracting') && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden sticky top-4">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900 text-sm">원본 이미지</h3>
                  </div>
                  <div className="p-4">
                    <img
                      src={sourceImageUrl}
                      alt="Source"
                      className="rounded-xl w-full object-contain max-h-[400px]"
                    />
                  </div>
                  <div className="p-4 border-t border-gray-100 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">감지된 아이템</span>
                      <span className="font-semibold text-gray-900">{items.length}개</span>
                    </div>
                    {items.length > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">추출 완료</span>
                        <span className="font-semibold text-green-600">{doneCount}/{items.length}</span>
                      </div>
                    )}
                    <button
                      onClick={handleExtractAll}
                      disabled={extractingCount > 0 || doneCount === items.length}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2.5 rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-all"
                    >
                      {extractingCount > 0 ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          추출 중... ({doneCount}/{items.length})
                        </>
                      ) : doneCount === items.length && items.length > 0 ? (
                        <>
                          <Check size={16} />
                          전체 추출 완료
                        </>
                      ) : (
                        <>
                          <Scissors size={16} />
                          전체 누끼 추출
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleReset}
                      className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 text-sm font-medium transition-colors"
                    >
                      <X size={16} />
                      새 이미지로 시작
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    감지된 아이템 ({items.length}개)
                  </h2>
                </div>

                {items.map((item, index) => (
                  <div
                    key={`${item.slot}-${index}`}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border ${SLOT_COLORS[item.slot] || 'bg-gray-100 text-gray-700 border-gray-300'}`}
                          >
                            {SLOT_LABELS[item.slot] || item.slot}
                          </span>
                          <div>
                            <h3 className="font-semibold text-gray-900">{item.label}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                          </div>
                        </div>

                        {item.status === 'idle' && (
                          <button
                            onClick={() => handleExtractSingle(index)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors"
                          >
                            <Scissors size={14} />
                            누끼 추출
                          </button>
                        )}
                        {item.status === 'extracting' && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                            <Loader2 size={14} className="animate-spin" />
                            추출 중...
                          </div>
                        )}
                        {item.status === 'error' && (
                          <button
                            onClick={() => handleExtractSingle(index)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors"
                          >
                            <AlertCircle size={14} />
                            재시도
                          </button>
                        )}
                      </div>

                      {item.status === 'extracting' && (
                        <div className="bg-blue-50 rounded-xl p-6 flex flex-col items-center gap-3">
                          <Loader2 size={32} className="text-blue-600 animate-spin" />
                          <p className="text-sm text-blue-700 font-medium">
                            AI가 제품을 추출하고 있습니다...
                          </p>
                          <p className="text-xs text-blue-500">최대 30초 소요될 수 있습니다</p>
                        </div>
                      )}

                      {item.status === 'error' && (
                        <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3">
                          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                          <p className="text-sm text-red-700">{item.error}</p>
                        </div>
                      )}

                      {item.status === 'done' && item.extractedImageUrl && (
                        <div className="space-y-4">
                          <div className="bg-gray-50 rounded-xl p-4 flex justify-center">
                            <img
                              src={item.extractedImageUrl}
                              alt={item.label}
                              className="max-h-72 object-contain rounded-lg"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <a
                              href={item.extractedImageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                            >
                              <Download size={14} />
                              이미지 보기
                            </a>
                            {item.saved ? (
                              <div className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
                                <Check size={14} />
                                다운로드 + 제품 저장 완료
                              </div>
                            ) : (
                              <button
                                onClick={() => handleCompressAndSave(index)}
                                disabled={item.saving}
                                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 text-sm font-medium transition-colors shadow-sm"
                              >
                                {item.saving ? (
                                  <>
                                    <Loader2 size={14} className="animate-spin" />
                                    압축 + AI 분석 + 저장 중...
                                  </>
                                ) : (
                                  <>
                                    <Save size={14} />
                                    압축 다운로드 + 제품 저장
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                    <Package size={40} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">감지된 아이템이 없습니다</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {phase === 'upload' && !sourceImageUrl && (
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-blue-600" />
              사용 방법
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Upload size={22} className="text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">1. 사진 업로드</h4>
                <p className="text-sm text-gray-500">모델이 옷을 입고 있는 사진을 업로드합니다</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <ScanSearch size={22} className="text-cyan-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">2. AI 아이템 감지</h4>
                <p className="text-sm text-gray-500">AI가 사진에서 각 의류 아이템을 자동으로 감지합니다</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Scissors size={22} className="text-emerald-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">3. 누끼 추출</h4>
                <p className="text-sm text-gray-500">모델을 제거하고 제품만 깨끗한 누끼컷으로 추출합니다</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
