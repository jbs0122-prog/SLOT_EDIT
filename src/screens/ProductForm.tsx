import { useState, useEffect } from 'react';
import { Product } from '../data/outfits';
import { supabase } from '../utils/supabase';
import { uploadProductImage, validateImageFile } from '../utils/imageUpload';
import { X, Save, Upload, Loader2 } from 'lucide-react';

interface ProductFormProps {
  product?: Product | null;
  onSave: () => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { value: 'outer', label: '아우터' },
  { value: 'top', label: '상의' },
  { value: 'bottom', label: '하의' },
  { value: 'shoes', label: '신발' },
  { value: 'bag', label: '가방' },
  { value: 'accessory', label: '액세서리' }
];

const GENDERS = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
  { value: 'UNISEX', label: '유니섹스' }
];

const BODY_TYPES = ['slim', 'regular', 'plus-size'];
const VIBES = ['ELEVATED_COOL', 'EFFORTLESS_NATURAL', 'ARTISTIC_MINIMAL', 'RETRO_LUXE', 'SPORT_MODERN', 'CREATIVE_LAYERED'];
const SEASONS = ['spring', 'summer', 'fall', 'winter'];
const STOCK_STATUS = [
  { value: 'in_stock', label: '재고 있음' },
  { value: 'out_of_stock', label: '품절' },
  { value: 'coming_soon', label: '출시 예정' }
];

export default function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const [formData, setFormData] = useState({
    brand: '',
    name: '',
    category: 'top' as Product['category'],
    gender: 'UNISEX',
    body_type: [] as string[],
    vibe: [] as string[],
    color: '',
    season: [] as string[],
    silhouette: '',
    image_url: '',
    product_link: '',
    affiliate_link: '',
    price: null as number | null,
    stock_status: 'in_stock' as Product['stock_status'],
    material: ''
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (product) {
      setFormData({
        brand: product.brand,
        name: product.name,
        category: product.category,
        gender: product.gender,
        body_type: product.body_type || [],
        vibe: product.vibe || [],
        color: product.color,
        season: product.season || [],
        silhouette: product.silhouette,
        image_url: product.image_url,
        product_link: product.product_link,
        affiliate_link: (product as any).affiliate_link || '',
        price: product.price,
        stock_status: product.stock_status,
        material: (product as any).material || ''
      });
    }
  }, [product]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const toggleArrayValue = (field: 'body_type' | 'vibe' | 'season', value: string) => {
    setFormData(prev => {
      const array = prev[field];
      const newArray = array.includes(value)
        ? array.filter(v => v !== value)
        : [...array, value];
      return { ...prev, [field]: newArray };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setErrors(prev => ({ ...prev, image_url: validationError }));
      return;
    }

    setUploading(true);
    setErrors(prev => ({ ...prev, image_url: '' }));

    const result = await uploadProductImage(file);

    if (result.success && result.url) {
      handleChange('image_url', result.url);
    } else {
      setErrors(prev => ({ ...prev, image_url: result.error || '업로드 실패' }));
    }

    setUploading(false);
    e.target.value = '';
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '제품명을 입력하세요';
    }
    if (!formData.image_url.trim()) {
      newErrors.image_url = '이미지 URL을 입력하세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        updated_at: new Date().toISOString()
      };

      if (product) {
        const { error } = await supabase
          .from('products')
          .update(dataToSave)
          .eq('id', product.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert([dataToSave]);

        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Save error:', error);
      alert('저장 실패: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {product ? '제품 수정' : '제품 추가'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                브랜드
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: Zara, Nike"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제품명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="예: 오버사이즈 후드티"
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                성별
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {GENDERS.map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                색상
              </label>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: black, white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                실루엣
              </label>
              <input
                type="text"
                value={formData.silhouette}
                onChange={(e) => handleChange('silhouette', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: oversized, fitted"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                가격 ($)
              </label>
              <input
                type="number"
                value={formData.price || ''}
                onChange={(e) => handleChange('price', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="예: 50"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                재고 상태
              </label>
              <select
                value={formData.stock_status}
                onChange={(e) => handleChange('stock_status', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {STOCK_STATUS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              체형 태그
            </label>
            <div className="flex flex-wrap gap-2">
              {BODY_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleArrayValue('body_type', type)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    formData.body_type.includes(type)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              스타일 무드
            </label>
            <div className="flex flex-wrap gap-2">
              {VIBES.map(vibe => (
                <button
                  key={vibe}
                  type="button"
                  onClick={() => toggleArrayValue('vibe', vibe)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    formData.vibe.includes(vibe)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {vibe}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시즌
            </label>
            <div className="flex flex-wrap gap-2">
              {SEASONS.map(season => (
                <button
                  key={season}
                  type="button"
                  onClick={() => toggleArrayValue('season', season)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    formData.season.includes(season)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {season}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              소재
            </label>
            <input
              type="text"
              value={formData.material}
              onChange={(e) => handleChange('material', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: cotton, wool, leather"
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제품 이미지 <span className="text-red-500">*</span>
            </label>

            <div className="space-y-4">
              <div>
                <label className="flex items-center justify-center w-full px-4 py-3 bg-blue-50 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Loader2 size={20} className="animate-spin" />
                      <span>업로드 중...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-blue-600">
                      <Upload size={20} />
                      <span className="font-medium">이미지 파일 업로드</span>
                      <span className="text-xs text-gray-500">(최대 5MB, JPEG/PNG/WebP/GIF)</span>
                    </div>
                  )}
                </label>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">또는</span>
                </div>
              </div>

              <div>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => handleChange('image_url', e.target.value)}
                  disabled={uploading}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.image_url ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="이미지 URL 직접 입력: https://example.com/image.jpg"
                />
              </div>
            </div>

            {errors.image_url && (
              <p className="text-red-500 text-xs mt-1">{errors.image_url}</p>
            )}

            {formData.image_url && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">미리보기:</p>
                <img
                  src={formData.image_url}
                  alt="Preview"
                  className="w-48 h-48 object-cover rounded-lg border-2 border-gray-200"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/192?text=Invalid+URL';
                  }}
                />
              </div>
            )}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              쇼핑 링크
            </label>
            <input
              type="url"
              value={formData.product_link}
              onChange={(e) => handleChange('product_link', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/product"
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amazon 어필리에이트 링크
            </label>
            <input
              type="url"
              value={formData.affiliate_link}
              onChange={(e) => handleChange('affiliate_link', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://www.amazon.com/dp/XXXXX?tag=your-tag-20"
            />
            <p className="text-xs text-gray-500 mt-1">
              Amazon Associates에서 생성한 어필리에이트 링크를 입력하세요
            </p>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
