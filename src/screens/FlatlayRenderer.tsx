import { useState, useEffect } from 'react';
import { X, Image as ImageIcon, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { generateAndSaveFlatlay } from '../utils/flatlayRenderer';
import { generateAndSaveModelPhoto } from '../utils/modelPhotoGenerator';

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

export default function FlatlayRenderer({ outfitId, onClose, onRendered }: FlatlayRendererProps) {
  const [items, setItems] = useState<OutfitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [renderedImageUrl, setRenderedImageUrl] = useState('');
  const [modelImageUrl, setModelImageUrl] = useState('');
  const [modelPhotoError, setModelPhotoError] = useState('');
  const [renderingStep, setRenderingStep] = useState('');

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
            id,
            name,
            brand,
            image_url,
            nobg_image_url,
            price
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

  const handleRender = async () => {
    if (items.length === 0) {
      setError('렌더링할 제품이 없습니다.');
      return;
    }

    setRendering(true);
    setError('');
    setModelPhotoError('');
    setSuccess(false);
    setRenderingStep('플랫레이 이미지 생성 중...');

    try {
      const validItems = items.filter(item => item.product?.image_url);
      if (validItems.length === 0) {
        throw new Error('이미지가 있는 제품이 없습니다.');
      }

      const renderItems = validItems.map(item => ({
        slot_type: item.slot_type,
        product_id: item.product_id,
        image_url: item.product!.nobg_image_url || item.product!.image_url,
        skipBgRemoval: !!item.product!.nobg_image_url,
        price: item.product!.price,
        name: item.product!.name,
      }));

      const { imageUrl, cleanImageUrl } = await generateAndSaveFlatlay(outfitId, renderItems);

      setRenderedImageUrl(imageUrl);
      setRenderingStep('AI 모델컷 생성 중... (최대 30초 소요)');

      try {
        const modelUrl = await generateAndSaveModelPhoto(outfitId, cleanImageUrl);
        setModelImageUrl(modelUrl);
      } catch (modelError) {
        console.error('Model photo generation error:', modelError);
        setModelPhotoError((modelError as Error).message);
      }

      setSuccess(true);
      setRenderingStep('');
    } catch (err) {
      console.error('Render error:', err);
      setError((err as Error).message);
    } finally {
      setRendering(false);
      setRenderingStep('');
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
              <h2 className="text-2xl font-bold text-gray-900">플랫레이 렌더링</h2>
              <p className="text-sm text-gray-600">코디를 플랫레이 이미지로 생성합니다</p>
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
              {error && !success && (
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

              {success && (
                <div className="mb-4 space-y-3">
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
                </div>
              )}

              {!success && items.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      연결된 제품 ({items.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {items.map((item) => (
                        <div
                          key={item.product_id}
                          className="border border-gray-200 rounded-lg p-3"
                        >
                          {item.product?.image_url ? (
                            <img
                              src={item.product.image_url}
                              alt={item.product.name}
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
                          <li>뉴트럴 톤 배경과 자연스러운 레이어링 효과를 적용합니다</li>
                          <li>AI가 플랫레이 기반으로 모델컷을 자동 생성합니다 (서양인 모델)</li>
                          <li>생성된 이미지는 Supabase Storage에 자동 저장됩니다</li>
                          <li>각 제품에 쇼핑 버튼이 자동으로 추가됩니다</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleRender}
                    disabled={rendering}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-4 rounded-lg hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg shadow-lg"
                  >
                    {rendering ? (
                      <>
                        <Loader className="animate-spin" size={20} />
                        {renderingStep || '플랫레이 렌더링 중...'}
                      </>
                    ) : (
                      <>
                        <ImageIcon size={20} />
                        플랫레이 & 모델컷 생성
                      </>
                    )}
                  </button>
                </div>
              )}

              {success && renderedImageUrl && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">
                        플랫레이
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <img
                          src={renderedImageUrl}
                          alt="Rendered flatlay"
                          className="w-full rounded-lg shadow-md"
                        />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">
                        AI 모델컷
                      </h3>
                      {modelImageUrl ? (
                        <div className="bg-gray-50 rounded-lg p-3">
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
