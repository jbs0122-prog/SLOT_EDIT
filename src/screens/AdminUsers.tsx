import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import {
  Users,
  Search,
  RefreshCw,
  UserPlus,
  Calendar,
  TrendingUp,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Pin,
  Package,
  ExternalLink,
  Key,
} from 'lucide-react';

interface UserItem {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  provider: string;
  created_at: string;
  last_sign_in_at: string | null;
  saved_count: number;
}

interface UserStats {
  total: number;
  new_today: number;
  new_this_week: number;
  new_this_month: number;
  provider_breakdown: Record<string, number>;
  daily_signups: Record<string, number>;
}

interface UserDetail {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  provider: string;
  created_at: string;
  last_sign_in_at: string | null;
  saved_outfits: { id: string; outfit_id: string; created_at: string }[];
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function fetchAdminAPI(action: string, params: Record<string, string> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const searchParams = new URLSearchParams({ action, ...params });
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/admin-users?${searchParams}`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'API Error');
  }

  return res.json();
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

function getProviderLabel(provider: string) {
  const map: Record<string, string> = {
    google: 'Google',
    email: 'Email',
    github: 'GitHub',
    apple: 'Apple',
  };
  return map[provider] || provider;
}

function getProviderColor(provider: string) {
  const map: Record<string, string> = {
    google: 'bg-blue-50 text-blue-700 border-blue-200',
    email: 'bg-gray-50 text-gray-700 border-gray-200',
    github: 'bg-gray-900 text-white border-gray-900',
    apple: 'bg-black text-white border-black',
  };
  return map[provider] || 'bg-gray-50 text-gray-700 border-gray-200';
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'last_sign_in_at' | 'saved_count'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, statsData] = await Promise.all([
        fetchAdminAPI('list'),
        fetchAdminAPI('stats'),
      ]);
      setUsers(usersData.users);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleUserClick = async (userId: string) => {
    if (selectedUser?.id === userId) {
      setSelectedUser(null);
      return;
    }
    setDetailLoading(true);
    try {
      const detail = await fetchAdminAPI('detail', { user_id: userId });
      setSelectedUser(detail);
    } catch (err) {
      console.error('Failed to load user detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filtered = users
    .filter((u) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let valA: string | number;
      let valB: string | number;

      if (sortField === 'saved_count') {
        valA = a.saved_count;
        valB = b.saved_count;
      } else {
        valA = a[sortField] || '';
        valB = b[sortField] || '';
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ChevronUp size={14} className="inline ml-1" />
    ) : (
      <ChevronDown size={14} className="inline ml-1" />
    );
  };

  const recentSignups = stats?.daily_signups
    ? Object.entries(stats.daily_signups)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
    : [];

  const maxSignup = recentSignups.length > 0
    ? Math.max(...recentSignups.map(([, v]) => v), 1)
    : 1;

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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">회원 관리</h1>
            <p className="text-gray-600">가입한 회원 목록과 활동 통계</p>
          </div>
          <div className="flex gap-2">
            <a
              href="#test-gemini"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 shadow-md"
            >
              <Key size={18} />
              API 테스트
            </a>
            <a
              href="#admin"
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              <Pin size={18} />
              핀 관리
            </a>
            <a
              href="#admin-products"
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              <Package size={18} />
              제품 관리
            </a>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Users size={20} className="text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">전체 회원</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <UserPlus size={20} className="text-green-600" />
                </div>
                <span className="text-sm text-gray-500">오늘 가입</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.new_today}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Calendar size={20} className="text-amber-600" />
                </div>
                <span className="text-sm text-gray-500">이번 주</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.new_this_week}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
                  <TrendingUp size={20} className="text-rose-600" />
                </div>
                <span className="text-sm text-gray-500">이번 달</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.new_this_month}</p>
            </div>
          </div>
        )}

        {recentSignups.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">
              일별 가입 추이 (최근 14일)
            </h3>
            <div className="flex items-end gap-1 h-24">
              {recentSignups.map(([date, count]) => (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500 font-medium">{count}</span>
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all"
                    style={{
                      height: `${(count / maxSignup) * 64}px`,
                      minHeight: count > 0 ? '4px' : '1px',
                    }}
                  />
                  <span className="text-[9px] text-gray-400 whitespace-nowrap">
                    {formatShortDate(date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats && Object.keys(stats.provider_breakdown).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
              가입 수단
            </h3>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(stats.provider_breakdown).map(([provider, count]) => (
                <div
                  key={provider}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium ${getProviderColor(provider)}`}
                >
                  {getProviderLabel(provider)}: {count}명
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="이메일 또는 이름 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{filtered.length}명</span>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                새로고침
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    회원
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    가입 수단
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('created_at')}
                  >
                    가입일 <SortIcon field="created_at" />
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('last_sign_in_at')}
                  >
                    마지막 로그인 <SortIcon field="last_sign_in_at" />
                  </th>
                  <th
                    className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                    onClick={() => handleSort('saved_count')}
                  >
                    저장 <SortIcon field="saved_count" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      {searchTerm ? '검색 결과가 없습니다.' : '아직 가입한 회원이 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      isSelected={selectedUser?.id === user.id}
                      detail={selectedUser?.id === user.id ? selectedUser : null}
                      detailLoading={detailLoading && selectedUser?.id === user.id}
                      onClick={() => handleUserClick(user.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserRow({
  user,
  isSelected,
  detail,
  detailLoading,
  onClick,
}: {
  user: UserItem;
  isSelected: boolean;
  detail: UserDetail | null;
  detailLoading: boolean;
  onClick: () => void;
}) {
  return (
    <>
      <tr
        className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
        onClick={onClick}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold">
                {(user.full_name || user.email || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              {user.full_name && (
                <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
              )}
              <p className={`text-xs truncate ${user.full_name ? 'text-gray-500' : 'text-sm font-medium text-gray-900'}`}>
                {user.email || '-'}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium border ${getProviderColor(user.provider)}`}>
            {getProviderLabel(user.provider)}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-600 text-xs">{formatDate(user.created_at)}</td>
        <td className="px-4 py-3 text-gray-600 text-xs">{formatDate(user.last_sign_in_at)}</td>
        <td className="px-4 py-3 text-center">
          {user.saved_count > 0 ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-700">
              <Bookmark size={13} className="text-gray-400" />
              {user.saved_count}
            </span>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>
      </tr>
      {isSelected && (
        <tr>
          <td colSpan={5} className="bg-gray-50/80 px-6 py-4 border-t border-gray-100">
            {detailLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                <RefreshCw size={14} className="animate-spin" />
                로딩 중...
              </div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {detail.avatar_url && (
                    <img
                      src={detail.avatar_url}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      {detail.full_name || detail.email}
                    </p>
                    {detail.full_name && (
                      <p className="text-sm text-gray-500">{detail.email}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">ID: {detail.id}</p>
                  </div>
                </div>

                {detail.saved_outfits.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      저장한 코디 ({detail.saved_outfits.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {detail.saved_outfits.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs text-gray-600"
                        >
                          <Bookmark size={12} />
                          <span className="font-mono">{s.outfit_id.slice(0, 8)}</span>
                          <span className="text-gray-400">
                            {new Date(s.created_at).toLocaleDateString('ko-KR')}
                          </span>
                          <a
                            href={`#admin`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.saved_outfits.length === 0 && (
                  <p className="text-sm text-gray-400">아직 저장한 코디가 없습니다.</p>
                )}
              </div>
            ) : null}
          </td>
        </tr>
      )}
    </>
  );
}
