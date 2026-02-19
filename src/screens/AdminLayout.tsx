import { useState, useEffect } from 'react';
import { LogOut, Package, MapPin, Users, ShoppingBag, Key } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { Session } from '@supabase/supabase-js';
import AdminLogin from './AdminLogin';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage?: 'pins' | 'products' | 'users' | 'amazon-search' | 'api-test';
}

export default function AdminLayout({ children, currentPage }: AdminLayoutProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const menuItems = [
    { id: 'pins' as const, label: 'Pins', icon: MapPin, href: '#admin' },
    { id: 'products' as const, label: 'Products', icon: Package, href: '#admin-products' },
    { id: 'amazon-search' as const, label: 'Amazon Search', icon: ShoppingBag, href: '#admin-amazon' },
    { id: 'users' as const, label: 'Users', icon: Users, href: '#admin-users' },
    { id: 'api-test' as const, label: 'API 테스트', icon: Key, href: '#test-gemini' },
  ];

  useEffect(() => {
    async function checkAdmin(s: Session | null) {
      if (!s?.user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', s.user.id)
        .maybeSingle();

      setIsAdmin(!!data);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      checkAdmin(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      checkAdmin(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || !isAdmin) {
    return <AdminLogin onLoginSuccess={() => {}} />;
  }

  return (
    <div className="flex min-h-screen bg-[#1a1a1a]">
      <aside className="fixed left-0 top-0 h-screen w-64 bg-black/40 backdrop-blur-sm border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-white text-black font-medium'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}
