import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Key } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  testResponse?: string;
  model?: string;
}

export default function GeminiKeyTest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setResult({ success: false, error: '관리자 로그인이 필요합니다.' });
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/test-gemini-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      setResult(data);
    } catch {
      setResult({
        success: false,
        error: '테스트 실행 실패',
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
                    {result.success ? 'Success' : 'Failed'}
                  </h3>
                  <p className={`text-sm ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.message || result.error}
                  </p>
                </div>
              </div>

              {result.model && (
                <div className="mb-4 p-3 bg-white rounded border">
                  <p className="text-xs text-gray-500 mb-1">Model</p>
                  <code className="text-sm font-mono text-gray-800">
                    {result.model}
                  </code>
                </div>
              )}

              {result.testResponse && (
                <div className="mb-4 p-3 bg-white rounded border">
                  <p className="text-xs text-gray-500 mb-1">Model Response</p>
                  <p className="text-sm text-gray-700">
                    {result.testResponse}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
