import { Home, Trophy, User } from 'lucide-react';

export type NavTab = 'home' | 'mens-ranking' | 'womens-ranking' | 'account';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs: { id: NavTab; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'mens-ranking', label: "Men's", icon: Trophy },
    { id: 'womens-ranking', label: "Women's", icon: Trophy },
    { id: 'account', label: 'My Account', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-black' : 'text-gray-400'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              <span className={`text-[10px] mt-0.5 tracking-wider uppercase ${isActive ? 'font-medium' : 'font-light'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
