import { Home, Trophy, User, LogIn } from 'lucide-react';
import { NavTab } from './BottomNav';
import { useAuth } from '../utils/AuthContext';

interface DesktopSidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onRequestLogin: () => void;
}

const navItems: { id: NavTab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'mens-ranking', label: "Men's Ranking", icon: Trophy },
  { id: 'womens-ranking', label: "Women's Ranking", icon: Trophy },
  { id: 'account', label: 'My Account', icon: User },
];

export default function DesktopSidebar({ activeTab, onTabChange, onRequestLogin }: DesktopSidebarProps) {
  const { user, signOut } = useAuth();

  return (
    <aside className="hidden md:flex flex-col h-screen w-[260px] border-r border-gray-200 bg-white flex-shrink-0 sticky top-0 z-30">
      <div className="px-6 pt-8 pb-6">
        <img src="/logo.png" alt="SLOT EDIT" className="h-14" />
      </div>

      <nav className="flex-1 px-3 py-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 mb-0.5 text-xs tracking-widest uppercase transition-all duration-200 ${
                isActive
                  ? 'text-black font-medium bg-gray-50'
                  : 'text-gray-400 font-light hover:text-black hover:bg-gray-50/60'
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-5 border-t border-gray-100">
        {user ? (
          <div>
            <div className="flex items-center gap-3 mb-3">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                  <User size={16} className="text-gray-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-black truncate leading-tight">
                  {user.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-[11px] text-gray-400 truncate leading-tight mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full py-2 text-[11px] tracking-widest uppercase text-gray-400 hover:text-black transition-colors font-light border border-gray-200 hover:border-black"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div>
            <p className="text-[11px] text-gray-400 font-light mb-3 leading-relaxed">
              Save your favorite outfits and build your personal style library.
            </p>
            <button
              onClick={onRequestLogin}
              className="w-full flex items-center justify-center gap-2 py-3 text-xs tracking-widest uppercase bg-black text-white hover:bg-gray-800 transition-all"
            >
              <LogIn size={14} />
              Sign In
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
