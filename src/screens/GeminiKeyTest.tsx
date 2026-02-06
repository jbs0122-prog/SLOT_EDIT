import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Key } from 'lucide-react';

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
  apiKeyPreview?: string;
  testResponse?: string;
  model?: string;
  billingStatus?: string;
  instructions?: string[];
  status?: number;
  fullResponse?: any;
}

export default function GeminiKeyTest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/test-gemini-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: '테스트 실행 실패',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Key size={32} className="text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Gemini API Key 테스트
            </h1>
          </div>

          <p className="text-gray-600 mb-6">
            Supabase Edge Functions에 설정된 GEMINI_API_KEY가 정상적으로 작동하는지 확인합니다.
            결제 상태, API 유효성, 모델 접근 권한 등을 검사합니다.
          </p>

          <button
            onClick={handleTest}
            disabled={testing}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-lg"
          >
            {testing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>테스트 중...</span>
              </>
            ) : (
              <>
                <Key size={20} />
                <span>API Key 테스트 실행</span>
              </>
            )}
          </button>

          {result && (
            <div className={`mt-6 p-6 rounded-lg border-2 ${
              result.success
                ? 'bg-green-50 border-green-300'
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-start gap-3 mb-4">
                {result.success ? (
                  <CheckCircle size={24} className="text-green-600 flex-shrink-0 mt-1" />
                ) : (
                  <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <h3 className={`text-xl font-bold mb-2 ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {result.success ? '✓ 성공' : '✗ 실패'}
                  </h3>
                  <p className={`text-sm ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.message || result.error}
                  </p>
                </div>
              </div>

              {result.apiKeyPreview && (
                <div className="mb-4 p-3 bg-white rounded border">
                  <p className="text-xs text-gray-500 mb-1">API Key (preview)</p>
                  <code className="text-sm font-mono text-gray-800">
                    {result.apiKeyPreview}
                  </code>
                </div>
              )}

              {result.model && (
                <div className="mb-4 p-3 bg-white rounded border">
                  <p className="text-xs text-gray-500 mb-1">Model</p>
                  <code className="text-sm font-mono text-gray-800">
                    {result.model}
                  </code>
                </div>
              )}

              {result.billingStatus && (
                <div className="mb-4 p-3 bg-white rounded border">
                  <p className="text-xs text-gray-500 mb-1">결제 상태</p>
                  <code className="text-sm font-mono text-green-700">
                    {result.billingStatus}
                  </code>
                </div>
              )}

              {result.testResponse && (
                <div className="mb-4 p-3 bg-white rounded border">
                  <p className="text-xs text-gray-500 mb-1">모델 응답</p>
                  <p className="text-sm text-gray-700">
                    {result.testResponse}
                  </p>
                </div>
              )}

              {result.details && (
                <div className="mb-4 p-3 bg-red-100 rounded border border-red-300">
                  <p className="text-xs text-red-500 mb-1">오류 상세</p>
                  <code className="text-xs font-mono text-red-800 whitespace-pre-wrap">
                    {result.details}
                  </code>
                </div>
              )}

              {result.instructions && result.instructions.length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 rounded border border-yellow-300">
                  <p className="text-sm font-semibold text-yellow-900 mb-2">
                    해결 방법:
                  </p>
                  <ol className="list-decimal list-inside space-y-1">
                    {result.instructions.map((instruction, idx) => (
                      <li key={idx} className="text-sm text-yellow-800">
                        {instruction}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {result.status && (
                <div className="mt-4 text-xs text-gray-500">
                  HTTP Status: {result.status}
                </div>
              )}
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">설정 방법:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Supabase Dashboard 접속</li>
              <li>Edge Functions → Secrets 탭 이동</li>
              <li>새 Secret 추가: GEMINI_API_KEY = your_api_key</li>
              <li>API Key 발급: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">https://aistudio.google.com/apikey</a></li>
            </ol>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">Free Tier 제한:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>분당 15 요청</li>
              <li>일일 1,500 요청</li>
              <li>더 높은 제한이 필요하면 결제 설정 필요</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
