import { useState, useEffect, useRef } from 'react';
import { Outfit, ImagePin } from '../data/outfits';
import { fetchOutfits } from '../utils/outfitService';
import { supabase } from '../utils/supabase';
import { X, Save, ArrowLeft } from 'lucide-react';

type ImageType = 'flatlay1' | 'flatlay2' | 'on_model';

export default function AdminPins() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageType>('flatlay1');
  const [pins, setPins] = useState<ImagePin[]>([]);
  const [selectedPinIndex, setSelectedPinIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadOutfits();
  }, []);

  const loadOutfits = async () => {
    try {
      const data = await fetchOutfits();
      setOutfits(data);
    } catch (error) {
      console.error('Failed to load outfits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOutfitSelect = (outfit: Outfit) => {
    setSelectedOutfit(outfit);
    setSelectedImage('flatlay1');
    setPins(outfit.flatlay1_pins || []);
    setSelectedPinIndex(null);
  };

  const handleImageTypeChange = (type: ImageType) => {
    if (!selectedOutfit) return;

    setSelectedImage(type);
    const pinsKey = `${type}_pins` as keyof Outfit;
    setPins((selectedOutfit[pinsKey] as ImagePin[]) || []);
    setSelectedPinIndex(null);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newPin: ImagePin = { x, y, item: 'outer' };
    setPins([...pins, newPin]);
    setSelectedPinIndex(pins.length);
  };

  const handlePinItemChange = (index: number, item: ImagePin['item']) => {
    const newPins = [...pins];
    newPins[index].item = item;
    setPins(newPins);
  };

  const handlePinUrlChange = (index: number, url: string) => {
    const newPins = [...pins];
    newPins[index].url = url;
    setPins(newPins);
  };

  const handlePinDelete = (index: number) => {
    const newPins = pins.filter((_, i) => i !== index);
    setPins(newPins);
    setSelectedPinIndex(null);
  };

  const handleSave = async () => {
    if (!selectedOutfit) return;

    setSaving(true);
    try {
      console.log('Saving pins:', pins);
      console.log('Selected image:', selectedImage);
      console.log('Outfit ID:', selectedOutfit.id);

      const updateData: Record<string, ImagePin[]> = {
        [`${selectedImage}_pins`]: pins,
      };

      console.log('Update data:', updateData);

      const { data, error } = await supabase
        .from('outfits')
        .update(updateData)
        .eq('id', selectedOutfit.id)
        .select();

      if (error) throw error;

      console.log('Save result:', data);

      // Verify the save by reading back from database
      const { data: verifyData, error: verifyError } = await supabase
        .from('outfits')
        .select(`${selectedImage}_pins`)
        .eq('id', selectedOutfit.id)
        .single();

      if (verifyError) throw verifyError;

      console.log('Verified data from DB:', verifyData);

      alert('저장되었습니다!');

      const updatedOutfits = outfits.map(o =>
        o.id === selectedOutfit.id
          ? { ...o, [`${selectedImage}_pins`]: pins }
          : o
      );
      setOutfits(updatedOutfits);
      setSelectedOutfit({ ...selectedOutfit, [`${selectedImage}_pins`]: pins });
    } catch (error) {
      console.error('Save error:', error);
      alert('저장 실패: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const getCurrentImageUrl = () => {
    if (!selectedOutfit) return '';
    if (selectedImage === 'flatlay1') return selectedOutfit.image_url_flatlay1;
    if (selectedImage === 'flatlay2') return selectedOutfit.image_url_flatlay2;
    return selectedOutfit.image_url_on_model;
  };

  const getItemLabel = (item: string) => {
    const labels: Record<string, string> = {
      outer: '아우터',
      top: '상의',
      bottom: '하의',
      shoes: '신발',
      bag: '가방',
      accessory: '액세서리'
    };
    return labels[item] || item;
  };

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">이미지 핀 관리자</h1>
          <p className="text-gray-600">이미지를 클릭하여 쇼핑 가능한 핀을 추가하세요</p>
        </div>

        {!selectedOutfit ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {outfits.map((outfit) => (
              <button
                key={outfit.id}
                onClick={() => handleOutfitSelect(outfit)}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 text-left"
              >
                <img
                  src={outfit.image_url_flatlay1}
                  alt={`${outfit.gender} - ${outfit.vibe}`}
                  className="w-full h-48 object-cover rounded-lg mb-3"
                />
                <div className="text-sm text-gray-600">
                  {outfit.gender} · {outfit.body_type} · {outfit.vibe}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  ID: {outfit.id.slice(0, 8)}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedOutfit(null)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
                뒤로 가기
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>

            <div className="mb-6">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => handleImageTypeChange('flatlay1')}
                  className={`px-4 py-2 rounded-lg ${
                    selectedImage === 'flatlay1'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  플랫레이 1
                </button>
                <button
                  onClick={() => handleImageTypeChange('flatlay2')}
                  className={`px-4 py-2 rounded-lg ${
                    selectedImage === 'flatlay2'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  플랫레이 2
                </button>
                <button
                  onClick={() => handleImageTypeChange('on_model')}
                  className={`px-4 py-2 rounded-lg ${
                    selectedImage === 'on_model'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  착용 사진
                </button>
              </div>

              <div className="relative inline-block max-w-full">
                <div
                  ref={imageRef}
                  onClick={handleImageClick}
                  className="relative cursor-crosshair"
                  style={{ maxWidth: '800px' }}
                >
                  <img
                    src={getCurrentImageUrl()}
                    alt="outfit"
                    className="w-full rounded-lg"
                    draggable={false}
                  />

                  {pins.map((pin, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPinIndex(index);
                      }}
                      className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-white font-bold transform -translate-x-1/2 -translate-y-1/2 transition-transform ${
                        selectedPinIndex === index
                          ? 'bg-red-500 scale-125'
                          : 'bg-blue-500 hover:scale-110'
                      }`}
                      style={{
                        left: `${pin.x}%`,
                        top: `${pin.y}%`,
                      }}
                    >
                      +
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {selectedPinIndex !== null && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">
                    핀 #{selectedPinIndex + 1} 설정
                  </h3>
                  <button
                    onClick={() => handlePinDelete(selectedPinIndex)}
                    className="text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <X size={16} />
                    삭제
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      연결할 아이템
                    </label>
                    <select
                      value={pins[selectedPinIndex].item}
                      onChange={(e) =>
                        handlePinItemChange(
                          selectedPinIndex,
                          e.target.value as ImagePin['item']
                        )
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="outer">아우터</option>
                      <option value="top">상의</option>
                      <option value="bottom">하의</option>
                      <option value="shoes">신발</option>
                      <option value="bag">가방</option>
                      <option value="accessory">액세서리</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      쇼핑 링크 URL
                    </label>
                    <input
                      type="url"
                      value={pins[selectedPinIndex].url || ''}
                      onChange={(e) => handlePinUrlChange(selectedPinIndex, e.target.value)}
                      placeholder="https://example.com/product"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      이 URL이 설정되면 outfit의 기본 아이템 링크 대신 이 링크가 사용됩니다.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">핀 목록</h3>
              {pins.length === 0 ? (
                <p className="text-blue-700 text-sm">
                  이미지를 클릭하여 핀을 추가하세요
                </p>
              ) : (
                <div className="space-y-2">
                  {pins.map((pin, index) => (
                    <div
                      key={index}
                      className="bg-white rounded p-2"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">
                          핀 #{index + 1}: {getItemLabel(pin.item)}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({pin.x.toFixed(1)}%, {pin.y.toFixed(1)}%)
                        </span>
                      </div>
                      {pin.url && (
                        <div className="text-xs text-blue-600 truncate">
                          URL: {pin.url}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
