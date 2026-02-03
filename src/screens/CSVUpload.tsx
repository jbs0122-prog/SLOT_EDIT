import { useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import Papa from 'papaparse';
import { Upload, Download, X, CheckCircle, AlertCircle } from 'lucide-react';

interface CSVUploadProps {
  onUploadComplete: () => void;
  onCancel: () => void;
}

interface CSVRow {
  brand: string;
  name: string;
  category: string;
  gender: string;
  body_type: string;
  vibe: string;
  color: string;
  season: string;
  silhouette: string;
  image_url: string;
  product_link: string;
  price: string;
  stock_status: string;
}

export default function CSVUpload({ onUploadComplete, onCancel }: CSVUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<CSVRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = `brand,name,category,gender,body_type,vibe,color,season,silhouette,image_url,product_link,price,stock_status
Zara,오버사이즈 후드티,top,MALE,"slim,athletic","casual,street",black,"fall,winter",oversized,https://example.com/image1.jpg,https://example.com/product1,59000,in_stock
Nike,에어포스 1,shoes,UNISEX,"slim,athletic,average","casual,sporty",white,"spring,summer,fall,winter",standard,https://example.com/image2.jpg,https://example.com/product2,129000,in_stock
Uniqlo,슬림핏 청바지,bottom,FEMALE,"slim,average","casual,minimal",blue,"spring,summer,fall,winter",slim,https://example.com/image3.jpg,https://example.com/product3,39000,out_of_stock`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'products_template.csv';
    link.click();
  };

  const parseArrayField = (value: string): string[] => {
    if (!value) return [];
    return value.split(',').map(v => v.trim()).filter(v => v);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const newErrors: string[] = [];

        if (results.data.length === 0) {
          newErrors.push('CSV 파일이 비어있습니다');
        }

        results.data.forEach((row, index) => {
          if (!row.name) {
            newErrors.push(`행 ${index + 2}: 제품명이 필요합니다`);
          }
          if (!row.image_url) {
            newErrors.push(`행 ${index + 2}: 이미지 URL이 필요합니다`);
          }
          if (!row.category || !['outer', 'top', 'bottom', 'shoes', 'bag', 'accessory'].includes(row.category)) {
            newErrors.push(`행 ${index + 2}: 유효하지 않은 카테고리 (outer, top, bottom, shoes, bag, accessory 중 하나)`);
          }
          if (!row.gender || !['MALE', 'FEMALE', 'UNISEX'].includes(row.gender)) {
            newErrors.push(`행 ${index + 2}: 유효하지 않은 성별 (MALE, FEMALE, UNISEX 중 하나)`);
          }
        });

        setErrors(newErrors);
        setPreview(results.data.slice(0, 10));
      },
      error: (error) => {
        setErrors([`CSV 파싱 오류: ${error.message}`]);
      }
    });
  };

  const handleUpload = async () => {
    if (preview.length === 0 || errors.length > 0) return;

    if (!fileInputRef.current?.files?.[0]) return;

    setUploading(true);
    setSuccess(false);

    try {
      const file = fileInputRef.current.files[0];

      Papa.parse<CSVRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const productsToInsert = results.data.map(row => ({
            brand: row.brand || '',
            name: row.name,
            category: row.category,
            gender: row.gender,
            body_type: parseArrayField(row.body_type),
            vibe: parseArrayField(row.vibe),
            color: row.color || '',
            season: parseArrayField(row.season),
            silhouette: row.silhouette || '',
            image_url: row.image_url,
            product_link: row.product_link || '',
            price: row.price ? parseInt(row.price) : null,
            stock_status: row.stock_status || 'in_stock'
          }));

          const { error } = await supabase
            .from('products')
            .insert(productsToInsert);

          if (error) throw error;

          setSuccess(true);
          setTimeout(() => {
            onUploadComplete();
          }, 1500);
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      setErrors([`업로드 실패: ${(error as Error).message}`]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">CSV 일괄 업로드</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-12">
              <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                업로드 완료!
              </h3>
              <p className="text-gray-600">
                {preview.length}개의 제품이 성공적으로 등록되었습니다.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  CSV 템플릿 다운로드
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  먼저 템플릿을 다운로드하여 제품 정보를 입력하세요.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <Download size={18} />
                  템플릿 다운로드
                </button>
              </div>

              <div className="mb-6 border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  CSV 파일 업로드
                </h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-file"
                  />
                  <label
                    htmlFor="csv-file"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload size={48} className="text-gray-400 mb-3" />
                    <p className="text-gray-600 mb-2">
                      CSV 파일을 선택하거나 드래그하세요
                    </p>
                    <p className="text-sm text-gray-500">
                      최대 파일 크기: 10MB
                    </p>
                  </label>
                </div>
              </div>

              {errors.length > 0 && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <h4 className="font-semibold text-red-900">
                      {errors.length}개의 오류 발견
                    </h4>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                    {errors.slice(0, 10).map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                    {errors.length > 10 && (
                      <li className="text-red-600 font-medium">
                        ...외 {errors.length - 10}개의 오류
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {preview.length > 0 && errors.length === 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    미리보기 ({preview.length}개 행)
                  </h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">브랜드</th>
                          <th className="px-4 py-2 text-left">제품명</th>
                          <th className="px-4 py-2 text-left">카테고리</th>
                          <th className="px-4 py-2 text-left">성별</th>
                          <th className="px-4 py-2 text-left">가격</th>
                          <th className="px-4 py-2 text-left">재고</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-2">{row.brand}</td>
                            <td className="px-4 py-2">{row.name}</td>
                            <td className="px-4 py-2">{row.category}</td>
                            <td className="px-4 py-2">{row.gender}</td>
                            <td className="px-4 py-2">{row.price}</td>
                            <td className="px-4 py-2">{row.stock_status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={onCancel}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || preview.length === 0 || errors.length > 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Upload size={18} />
                  {uploading ? '업로드 중...' : '업로드'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
