import { useState } from 'react';
import { Lock, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const email = `${userId}@admin.com`;

      if (mode === 'signup') {
        if (password.length < 6) {
          setError('비밀번호는 6자 이상이어야 합니다.');
          return;
        }
        if (password !== confirmPassword) {
          setError('비밀번호가 일치하지 않습니다.');
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            setError('이미 등록된 ID입니다.');
          } else {
            setError(signUpError.message);
          }
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setSuccess('계정이 생성되었습니다. 로그인해주세요.');
          setMode('login');
          return;
        }

        onLoginSuccess();
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          setError('ID 또는 비밀번호가 올바르지 않습니다.');
          return;
        }

        onLoginSuccess();
      }
    } catch {
      setError(mode === 'login' ? '로그인 중 오류가 발생했습니다.' : '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
    setSuccess('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-6">
            <Lock className="w-7 h-7 text-white/60" />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Admin</h1>
          <p className="text-sm text-white/40 mt-2">
            {mode === 'login' ? '관리자 계정으로 로그인해주세요' : '새 관리자 계정을 만들어주세요'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all"
              placeholder="아이디를 입력하세요"
              required
              autoFocus
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all"
                placeholder="비밀번호를 입력하세요"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Password 확인</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all"
                placeholder="비밀번호를 다시 입력하세요"
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !userId || !password || (mode === 'signup' && !confirmPassword)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black font-medium rounded-xl hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-6"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                로그인
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                회원가입
              </>
            )}
          </button>
        </form>

        <button
          onClick={toggleMode}
          className="w-full mt-4 text-center text-sm text-white/40 hover:text-white/60 transition-colors py-2"
        >
          {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
        </button>
      </div>
    </div>
  );
}
