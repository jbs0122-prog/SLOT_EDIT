import { useState, useEffect, useRef } from 'react';
import { LogOut, Package, MapPin, Users, ShoppingBag, Key, GripVertical, Camera, Link as LinkIcon, Zap, Dna } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { Session } from '@supabase/supabase-js';
import AdminLogin from './AdminLogin';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage?: 'pins' | 'products' | 'outfit-linker' | 'users' | 'amazon-search' | 'smart-search' | 'api-test' | 'auto-pipeline' | 'style-dna-lab';
}

const DEFAULT_MENU = [
  { id: 'style-dna-lab' as const, label: 'Style DNA Lab', icon: 'Dna', href: '#admin-style-dna' },
  { id: 'auto-pipeline' as const, label: 'Auto Pipeline', icon: 'Zap', href: '#admin-auto-pipeline' },
  { id: 'pins' as const, label: 'Pins', icon: 'MapPin', href: '#admin' },
  { id: 'products' as const, label: 'Products', icon: 'Package', href: '#admin-products' },
  { id: 'outfit-linker' as const, label: '코디 연결', icon: 'LinkIcon', href: '#admin-outfit-linker' },
  { id: 'amazon-search' as const, label: 'Amazon Search', icon: 'ShoppingBag', href: '#admin-amazon' },
  { id: 'smart-search' as const, label: 'Smart Search', icon: 'Camera', href: '#admin-smart' },
  { id: 'users' as const, label: 'Users', icon: 'Users', href: '#admin-users' },
  { id: 'api-test' as const, label: 'API 테스트', icon: 'Key', href: '#test-gemini' },
];

const ICON_MAP: Record<string, React.ElementType> = {
  MapPin,
  Package,
  LinkIcon,
  ShoppingBag,
  Camera,
  Users,
  Key,
  Zap,
  Dna,
};

const STORAGE_KEY = 'admin_menu_order';

function loadMenuOrder(): typeof DEFAULT_MENU {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_MENU;
    const savedIds: string[] = JSON.parse(saved);
    const ordered = savedIds
      .map((id) => DEFAULT_MENU.find((m) => m.id === id))
      .filter(Boolean) as typeof DEFAULT_MENU;
    const missing = DEFAULT_MENU.filter((m) => !savedIds.includes(m.id));
    return [...ordered, ...missing];
  } catch {
    return DEFAULT_MENU;
  }
}

function saveMenuOrder(items: typeof DEFAULT_MENU) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map((m) => m.id)));
}

export default function AdminLayout({ children, currentPage }: AdminLayoutProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<typeof DEFAULT_MENU>(loadMenuOrder);

  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setIsAdmin(!!s?.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setIsAdmin(!!s?.user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
  };

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverIndex.current = index;
    if (dragIndex.current === null || dragIndex.current === index) return;

    setMenuItems((prev) => {
      const next = [...prev];
      const [item] = next.splice(dragIndex.current!, 1);
      next.splice(index, 0, item);
      dragIndex.current = index;
      return next;
    });
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    dragOverIndex.current = null;
    setMenuItems((prev) => {
      saveMenuOrder(prev);
      return prev;
    });
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
          <ul className="space-y-1">
            {menuItems.map((item, index) => {
              const Icon = ICON_MAP[item.icon];
              const isActive = currentPage === item.id;
              return (
                <li
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="group relative"
                >
                  <a
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all select-none ${
                      isActive
                        ? 'bg-white text-black font-medium'
                        : item.id === 'style-dna-lab'
                        ? 'text-white hover:bg-white/10 bg-teal-500/5 border border-teal-500/15'
                        : item.id === 'auto-pipeline'
                        ? 'text-white hover:bg-white/10 bg-white/5 border border-white/10'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <GripVertical
                      className={`w-4 h-4 shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-40 transition-opacity ${
                        isActive ? 'text-black' : 'text-white'
                      }`}
                    />
                    <Icon className={`w-5 h-5 shrink-0 ${item.id === 'auto-pipeline' && !isActive ? 'text-white' : ''}`} />
                    <span className="flex-1">{item.label}</span>
                    {item.id === 'style-dna-lab' && !isActive && (
                      <span className="text-[9px] font-bold bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded-full border border-teal-500/30">
                        NEW
                      </span>
                    )}
                    {item.id === 'auto-pipeline' && !isActive && (
                      <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                        NEW
                      </span>
                    )}
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
