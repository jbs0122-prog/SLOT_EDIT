import { useState, useEffect } from 'react';
import { X, Image as ImageIcon, AlertCircle, CheckCircle, Loader, Send, RefreshCw, Download } from 'lucide-react';
import { supabase } from '../utils/supabase';
import {
  prepareFlatlayForEditor,
  renderFlatlayFromEditorData,
  saveFlatlayToStorage,
  reconstructEditorDataFromPins,
  type EditorProductData,
  type ProductPosition,
} from '../utils/flatlayRenderer';
import { removeBackground } from '../utils/backgroundRemoval';
import { generateAndSaveModelPhoto, reviseModelPhoto } from '../utils/modelPhotoGenerator';
import { generateInsightForOutfit } from '../utils/outfitService';
import { downloadHighQualityImage } from '../utils/imageCompression';
import FlatLayEditor from './FlatLayEditor';

interface FlatlayRendererProps {
  outfitId: string;
  onClose: () => void;
  onRendered: () => void;
}

interface OutfitItem {
  slot_type: string;
  product_id: string;
  product?: {
    id: string;
    name: string;
    brand: string;
    image_url: string;
    nobg_image_url: string | null;
    price: number | null;
  };
}

type Phase = 'idle' | 'preparing' | 'editing' | 'rendering' | 'success';

function isPixianNobgUrl(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return false;
  return url.includes('/nobg/');
}

export default function FlatlayRenderer({ outfitId, onClose, onRendered }: FlatlayRendererProps) {
  const [items, setItems] = useState<OutfitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [editorData, setEditorData] = useState<EditorProductData[] | null>(null);
  const [renderingStep, setRenderingStep] = useState('');
  const [renderedImageUrl, setRenderedImageUrl] = useState('');
  const [cleanImageUrl, setCleanImageUrl] = useState('');
  const [modelImageUrl, setModelImageUrl] = useState('');
  const [modelPhotoError, setModelPhotoError] = useState('');
  const [revisionText, setRevisionText] = useState('');
  const [revising, setRevising] = useState(false);
  const [revisionError, setRevisionError] = useState('');
  const [downloadingFlatlay, setDownloadingFlatlay] = useState(false);
  const [downloadingModel, setDownloadingModel] = useState(false);

  useEffect(() => {
    loadOutfitItems();
  }, [outfitId]);

  const loadOutfitItems = async () => {
    try {
      setLoading(true);
      const { data: itemsData, error: itemsError } = await supabase
        .from('outfit_items')
        .select(`
          slot_type,
          product_id,
          product:products (
            id, name, brand, image_url, nobg_image_url, price
          )
        `)
        .eq('outfit_id', outfitId);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
      if (!itemsData || itemsData.length === 0) {
        setError('이 코디에 연결된 제품이 없습니다. 먼저 제품을 연결해주세요.');
      }
    } catch (err) {
      console.error('Load error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareEditor = async () => {
    if (items.length === 0) {
      setError('렌더링할 제품이 없습니다.');
      return;
    }

    setPhase('preparing');
    setError('');
    setModelPhotoError('');
    setRenderingStep('레이아웃 준비 중...');

    try {
      const validItems = items.filter(item => item.product?.image_url);
      if (validItems.length === 0) {
        throw new Error('이미지가 있는 제품이 없습니다.');
      }

      const { data: outfitData } = await supabase
        .from('outfits')
        .select('flatlay_pins')
        .eq('id', outfitId)
        .maybeSingle();

      const savedPins = outfitData?.flatlay_pins as ProductPosition[] | null;
      const currentProductIds = new Set(validItems.map(i => i.product_id));

      const pinsMatch = savedPins && savedPins.length > 0 &&
        savedPins.length === currentProductIds.size &&
        savedPins.every(pin => currentProductIds.has(pin.product_id));

      if (pinsMatch && savedPins) {
        setRenderingStep('저장된 레이아웃 불러오는 중...');

        const updatedPins = [...savedPins];
        for (let i = 0; i < updatedPins.length; i++) {
          const pin = updatedPins[i];
          const item = validItems.find(vi => vi.product_id === pin.product_id);
          if (item?.product?.nobg_image_url?.trim()) {
            updatedPins[i] = { ...pin, image_url: item.product.nobg_image_url };
          }
        }

        const pinsNeedingBgRemoval = updatedPins.filter((pin) => {
          const item = validItems.find(vi => vi.product_id === pin.product_id);
          return !isPixianNobgUrl(item?.product?.nobg_image_url);
        });

        if (pinsNeedingBgRemoval.length > 0) {
          setRenderingStep('배경 제거 중...');
          for (let i = 0; i < updatedPins.length; i++) {
            const pin = updatedPins[i];
            const item = validItems.find(vi => vi.product_id === pin.product_id);
            if (!isPixianNobgUrl(item?.product?.nobg_image_url)) {
              const sourceUrl = item?.product?.nobg_image_url?.trim() || item?.product?.image_url;
              if (sourceUrl) {
                try {
                  const nobgUrl = await removeBackground(sourceUrl, pin.product_id);
                  updatedPins[i] = { ...pin, image_url: nobgUrl };
                } catch (e) {
                  console.error('bg removal failed for', pin.product_id, e);
                }
              }
            }
          }
        }

        const data = reconstructEditorDataFromPins(updatedPins);
        setEditorData(data);
        setPhase('editing');
      } else {
        setRenderingStep('레이아웃 계산 및 배경 제거 중...');
        const renderItems = validItems.map(item => {
          const hasPixianNobg = isPixianNobgUrl(item.product!.nobg_image_url);
          const hasAnyNobg = !!item.product!.nobg_image_url?.trim();
          return {
            slot_type: item.slot_type,
            product_id: item.product_id,
            image_url: hasPixianNobg
              ? item.product!.nobg_image_url!
              : hasAnyNobg
                ? item.product!.nobg_image_url!
                : item.product!.image_url,
            skipBgRemoval: hasPixianNobg,
            price: item.product!.price,
            name: item.product!.name,
          };
        });

        const data = await prepareFlatlayForEditor(renderItems, {}, setRenderingStep);
        setEditorData(data);
        setPhase('editing');
      }
    } catch (err) {
      console.error('Prepare error:', err);
      setError((err as Error).message);
      setPhase('idle');
    } finally {
      setRenderingStep('');
    }
  };

  const handleEditorConfirm = async (updatedItems: EditorProductData[]) => {
    setPhase('rendering');
    setEditorData(null);
    setError('');
    setRenderingStep('플랫레이 이미지 렌더링 중...');

    try {
      const { imageBlob, cleanBlob, positions } = await renderFlatlayFromEditorData(updatedItems);

      setRenderingStep('이미지 저장 중...');
      const { imageUrl, cleanImageUrl: cleanUrl } = await saveFlatlayToStorage(
        outfitId, imageBlob, cleanBlob, positions
      );

      setRenderedImageUrl(imageUrl);
      setCleanImageUrl(cleanUrl);

      setRenderingStep('AI 모델컷 및 AI Insight 생성 중... (최대 30초 소요)');
      const [modelResult] = await Promise.allSettled([
        generateAndSaveModelPhoto(outfitId, cleanUrl),
        generateInsightForOutfit(outfitId, cleanUrl),
      ]);

      if (modelResult.status === 'fulfilled') {
        setModelImageUrl(modelResult.value);
      } else {
        console.error('Model photo generation error:', modelResult.reason);
        setModelPhotoError(modelResult.reason?.message || 'Model photo generation failed');
      }

      setPhase('success');
    } catch (err) {
      console.error('Render error:', err);
      setError((err as Error).message);
      setPhase('idle');
    } finally {
      setRenderingStep('');
    }
  };

  const handleEditorCancel = () => {
    setEditorData(null);
    setPhase('idle');
  };

  const handleRevision = async () => {
    if (!revisionText.trim() || !modelImageUrl || !cleanImageUrl) return;

    setRevising(true);
    setRevisionError('');

    try {
      const newModelUrl = await reviseModelPhoto(
        outfitId, cleanImageUrl, modelImageUrl, revisionText.trim()
      );
      setModelImageUrl(newModelUrl);
      setRevisionText('');
    } catch (err) {
      console.error('Revision error:', err);
      setRevisionError((err as Error).message);
    } finally {
      setRevising(false);
    }
  };

  const handleDownloadFlatlay = async () => {
    if (!renderedImageUrl) return;
    setDownloadingFlatlay(true);
    try {
      await downloadHighQualityImage(
        renderedImageUrl,
        `flatlay_${outfitId}.png`,
        import.meta.env.VITE_SUPABASE_URL
      );
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingFlatlay(false);
    }
  };

  const handleDownloadModel = async () => {
    if (!modelImageUrl) return;
    setDownloadingModel(true);
    try {
      await downloadHighQualityImage(
        modelImageUrl,
        `model_${outfitId}.png`,
        import.meta.env.VITE_SUPABASE_URL
      );
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingModel(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
              <ImageIcon size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {phase === 'editing' ? '플랫레이 레이아웃 편집' : '플랫레이 렌더링'}
              </h2>
              <p className="text-sm text-gray-600">
                {phase === 'editing'
                  ? '제품 크기와 위치를 조정하세요'
                  : '코디를 플랫레이 이미지로 생성합니다'}
              </p>
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="animate-spin text-gray-400" size={32} />
            </div>
          ) : (
            <>
              {error && phase !== 'success' && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-900">오류</p>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {phase === 'idle' && items.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      연결된 제품 ({items.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {items.map((item) => (
                        <div key={item.product_id} className="border border-gray-200 rounded-lg p-3">
                          {(item.product?.nobg_image_url || item.product?.image_url) ? (
                            <img
                              src={item.product.nobg_image_url || item.product.image_url}
                              alt={item.product?.name}
                              className="w-full h-32 object-contain mb-2 bg-gray-50 rounded"
                            />
                          ) : (
                            <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center mb-2">
                              <ImageIcon size={24} className="text-gray-400" />
                            </div>
                          )}
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {item.product?.brand || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {item.product?.name || 'Unknown'}
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                            {item.slot_type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">렌더링 안내</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>제품 이미지의 흰 배경이 자동으로 제거됩니다</li>
                          <li>레이아웃 편집기에서 제품 크기와 위치를 직접 조정할 수 있습니다</li>
                          <li>모서리를 드래그하면 비율을 유지하며 크기가 조정됩니다</li>
                          <li>레이아웃 확정 후 AI 모델컷이 자동 생성됩니다</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handlePrepareEditor}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-4 rounded-lg hover:from-green-700 hover:to-teal-700 font-medium text-lg shadow-lg"
                  >
                    <ImageIcon size={20} />
                    플랫레이 레이아웃 편집
                  </button>
                </div>
              )}

              {(phase === 'preparing' || phase === 'rendering') && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader className="animate-spin text-teal-600 mb-4" size={40} />
                  <p className="text-gray-700 font-medium text-lg">
                    {renderingStep || '처리 중...'}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">잠시만 기다려주세요</p>
                </div>
              )}

              {phase === 'editing' && editorData && (
                <FlatLayEditor
                  items={editorData}
                  canvasWidth={1200}
                  canvasHeight={1400}
                  backgroundColor="#e8e0d5"
                  onConfirm={handleEditorConfirm}
                  onCancel={handleEditorCancel}
                />
              )}

              {phase === 'success' && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-900">플랫레이 생성 완료!</p>
                        <p className="text-sm text-green-700">
                          {modelImageUrl
                            ? '플랫레이 이미지와 AI 모델컷이 모두 성공적으로 생성되었습니다.'
                            : '플랫레이 이미지가 생성되었습니다.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {modelPhotoError && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex gap-3">
                        <AlertCircle size={20} className="text-amber-600 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-amber-900">모델컷 생성 실패</p>
                          <p className="text-sm text-amber-700">{modelPhotoError}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {renderedImageUrl && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-900">플랫레이</h3>
                          <button
                            onClick={handleDownloadFlatlay}
                            disabled={downloadingFlatlay}
                            title="고화질 PNG 다운로드"
                            className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                          >
                            {downloadingFlatlay
                              ? <Loader className="animate-spin" size={13} />
                              : <Download size={13} />}
                            <span>다운로드</span>
                          </button>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <img
                            src={renderedImageUrl}
                            alt="Rendered flatlay"
                            className="w-full rounded-lg shadow-md"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-900">AI 모델컷</h3>
                          {modelImageUrl && (
                            <button
                              onClick={handleDownloadModel}
                              disabled={downloadingModel || revising}
                              title="고화질 PNG 다운로드"
                              className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                            >
                              {downloadingModel
                                ? <Loader className="animate-spin" size={13} />
                                : <Download size={13} />}
                              <span>다운로드</span>
                            </button>
                          )}
                        </div>
                        {modelImageUrl ? (
                          <div className="bg-gray-50 rounded-lg p-3 relative">
                            {revising && (
                              <div className="absolute inset-0 bg-white bg-opacity-80 rounded-lg flex items-center justify-center z-10">
                                <div className="flex items-center gap-2 text-gray-700">
                                  <Loader className="animate-spin" size={20} />
                                  <span className="text-sm font-medium">수정 중...</span>
                                </div>
                              </div>
                            )}
                            <img
                              src={modelImageUrl}
                              alt="AI model photo"
                              className="w-full rounded-lg shadow-md"
                            />
                          </div>
                        ) : (
                          <div className="bg-gray-100 rounded-lg p-6 flex items-center justify-center h-full min-h-[200px]">
                            <p className="text-sm text-gray-500 text-center">
                              {modelPhotoError ? '생성 실패' : '생성되지 않음'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {modelImageUrl && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <RefreshCw size={16} className="text-gray-600" />
                        <h4 className="text-sm font-semibold text-gray-900">모델컷 수정 요청</h4>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={revisionText}
                          onChange={(e) => setRevisionText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !revising) handleRevision(); }}
                          placeholder="예: 포즈를 바꿔줘, 셔츠를 넣어서 입혀줘, 코트를 열어줘..."
                          disabled={revising}
                          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                        />
                        <button
                          onClick={handleRevision}
                          disabled={revising || !revisionText.trim()}
                          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                        >
                          {revising ? <Loader className="animate-spin" size={16} /> : <Send size={16} />}
                          수정
                        </button>
                      </div>
                      {revisionError && (
                        <p className="text-xs text-red-600 mt-2">{revisionError}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        AI에게 모델컷의 수정사항을 요청하세요. 기존 이미지를 기반으로 수정됩니다.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => { onRendered(); onClose(); }}
                    className="w-full bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 font-medium"
                  >
                    확인
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
