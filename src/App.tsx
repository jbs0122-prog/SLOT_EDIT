import { useState, useEffect, useRef } from 'react';
import Input from './screens/Input';
import Results from './screens/Results';
import Loading from './screens/Loading';
import AdminPins from './screens/AdminPins';
import AdminProducts from './screens/AdminProducts';
import AdminUsers from './screens/AdminUsers';
import AdminLayout from './screens/AdminLayout';
import GeminiKeyTest from './screens/GeminiKeyTest';
import BottomNav, { NavTab } from './screens/BottomNav';
import DesktopSidebar from './screens/DesktopSidebar';
import RankingPage from './screens/RankingPage';
import MyAccountPage from './screens/MyAccountPage';
import LoginModal from './screens/LoginModal';
import Footer from './screens/Footer';
import PrivacyPolicy from './screens/PrivacyPolicy';
import TermsOfService from './screens/TermsOfService';
import AffiliateDisclosure from './screens/AffiliateDisclosure';
import DMCAPolicy from './screens/DMCAPolicy';
import Accessibility from './screens/Accessibility';
import { Outfit } from './data/outfits';
import { fetchOutfits } from './utils/outfitService';
import { WeatherData, getSeasonsFromTemperature, getTargetWarmth } from './utils/weather';

type Screen = 'loading' | 'input' | 'results' | 'admin' | 'admin-products' | 'admin-users' | 'test-gemini' | 'privacy-policy' | 'terms-of-service' | 'affiliate-disclosure' | 'dmca-policy' | 'accessibility';

const RESULTS_KEY = 'slotedit_results';

function getHash(): string {
  return window.location.hash.replace('#', '');
}

function screenFromHash(h: string): Screen {
  if (h === 'admin') return 'admin';
  if (h === 'admin-products') return 'admin-products';
  if (h === 'admin-users') return 'admin-users';
  if (h === 'test-gemini') return 'test-gemini';
  if (h === 'privacy-policy') return 'privacy-policy';
  if (h === 'terms-of-service') return 'terms-of-service';
  if (h === 'affiliate-disclosure') return 'affiliate-disclosure';
  if (h === 'dmca-policy') return 'dmca-policy';
  if (h === 'accessibility') return 'accessibility';
  if (h.startsWith('results')) return 'results';
  return 'input';
}

function tabFromHash(h: string): NavTab {
  if (h.includes('womens-ranking')) return 'womens-ranking';
  if (h.includes('mens-ranking')) return 'mens-ranking';
  if (h.includes('account')) return 'account';
  return 'home';
}

function accountViewFromHash(h: string): 'menu' | 'saved' {
  return h.includes('account/saved') ? 'saved' : 'menu';
}

function hashForTab(tab: NavTab): string {
  if (tab === 'mens-ranking') return 'results/mens-ranking';
  if (tab === 'womens-ranking') return 'results/womens-ranking';
  if (tab === 'account') return 'results/account';
  return 'results';
}

function persistResults(outfitList: Outfit[], ctx: object) {
  try {
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify({ outfits: outfitList, ctx }));
  } catch { /* ignore */ }
}

function restoreResults(): { outfits: Outfit[]; ctx: any } | null {
  try {
    const raw = sessionStorage.getItem(RESULTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeString(str: string): string {
  return str.trim().toLowerCase().replace(/_/g, ' ');
}

function computeWeatherFit(outfit: Outfit, targetWarmth: number, isWetWeather: boolean): number {
  let score = 0;
  if (!outfit.items || outfit.items.length === 0) return 0;

  const warmths = outfit.items
    .map(item => item.product?.warmth)
    .filter((w): w is number => typeof w === 'number');

  if (warmths.length > 0) {
    const avgWarmth = warmths.reduce((s, w) => s + w, 0) / warmths.length;
    score += Math.max(0, 10 - Math.abs(avgWarmth - targetWarmth) * 3);
  }

  if (isWetWeather) {
    const hasOuter = outfit.items.some(item => item.slot_type === 'outer');
    if (hasOuter) score += 3;

    const wetResistantMaterials = ['leather', 'nylon', 'polyester', 'gore-tex', 'waterproof'];
    const hasResistantMaterial = outfit.items.some(item => {
      const material = (item.product?.material || '').toLowerCase();
      return wetResistantMaterials.some(m => material.includes(m));
    });
    if (hasResistantMaterial) score += 2;
  }

  return score;
}

function App() {
  const initialHash = getHash();
  const isAdmin = initialHash.startsWith('admin');

  const [currentScreen, setCurrentScreen] = useState<Screen>(isAdmin ? screenFromHash(initialHash) : 'loading');
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedOutfits, setSelectedOutfits] = useState<Outfit[]>([]);
  const [activeTab, setActiveTab] = useState<NavTab>(tabFromHash(initialHash));
  const [accountView, setAccountView] = useState<'menu' | 'saved'>(accountViewFromHash(initialHash));
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [context, setContext] = useState({
    gender: '',
    bodyType: '',
    vibe: '',
    weather: null as WeatherData | null,
  });

  const selectedOutfitsRef = useRef(selectedOutfits);
  selectedOutfitsRef.current = selectedOutfits;

  useEffect(() => {
    if (isAdmin) return;

    const load = async () => {
      try {
        const data = await fetchOutfits();
        setOutfits(data);

        const h = getHash();
        if (h.startsWith('results')) {
          const saved = restoreResults();
          if (saved) {
            setSelectedOutfits(saved.outfits);
            setContext(saved.ctx);
            setCurrentScreen('results');
            setActiveTab(tabFromHash(h));
            setAccountView(accountViewFromHash(h));
          } else {
            window.location.hash = '';
            setCurrentScreen('input');
          }
        } else {
          setCurrentScreen('input');
        }
      } catch {
        setCurrentScreen('input');
      }
    };

    load();
  }, []);

  useEffect(() => {
    const handler = () => {
      const h = getHash();
      const screen = screenFromHash(h);

      if (screen === 'results') {
        if (selectedOutfitsRef.current.length === 0) {
          const saved = restoreResults();
          if (saved) {
            setSelectedOutfits(saved.outfits);
            setContext(saved.ctx);
          } else {
            window.location.hash = '';
            return;
          }
        }
        setActiveTab(tabFromHash(h));
        setAccountView(accountViewFromHash(h));
      }

      setCurrentScreen(screen);
    };

    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const handleGenerate = (gender: string, bodyType: string, vibe: string, weather: WeatherData) => {
    const normalizedGender = normalizeString(gender);
    const normalizedBodyType = normalizeString(bodyType);
    const normalizedVibe = normalizeString(vibe);
    const weatherSeasons = getSeasonsFromTemperature(weather.temperature);
    const isCold = weather.temperature < 40;
    const isWetWeather = weather.condition === 'Rainy' || weather.condition === 'Snow';
    const targetWarmth = getTargetWarmth(weather.temperature);

    const matches = outfits.filter(outfit => {
      const matchesGender = normalizeString(outfit.gender) === normalizedGender;
      const matchesBodyType = normalizeString(outfit.body_type) === normalizedBodyType;
      const matchesVibe = normalizeString(outfit.vibe) === normalizedVibe;

      if (!matchesGender || !matchesBodyType || !matchesVibe) return false;

      const hasOuter = outfit.items?.some(item => item.slot_type === 'outer');
      if (isCold && !hasOuter) return false;

      if (outfit.items && outfit.items.length > 0) {
        const productsWithSeasons = outfit.items.filter(
          item => item.product?.season && item.product.season.length > 0
        );
        if (productsWithSeasons.length > 0) {
          const commonSeasons = productsWithSeasons.reduce<string[]>((acc, item) => {
            const productSeasons = item.product!.season;
            return acc.filter(s => productSeasons.includes(s));
          }, [...productsWithSeasons[0].product!.season]);

          return commonSeasons.length > 0 && weatherSeasons.some(s => commonSeasons.includes(s));
        }
      }

      return true;
    });

    const sorted = [...matches].sort((a, b) => {
      return computeWeatherFit(b, targetWarmth, isWetWeather) - computeWeatherFit(a, targetWarmth, isWetWeather);
    });

    const ctx = { gender, bodyType, vibe, weather };
    setSelectedOutfits(sorted);
    setContext(ctx);
    setActiveTab('home');
    setCurrentScreen('results');
    persistResults(sorted, ctx);

    const currentHash = getHash();
    if (!currentHash.startsWith('results')) {
      window.location.hash = 'results';
    }
  };

  const handleBack = () => {
    window.history.back();
  };

  const handleTabChange = (tab: NavTab) => {
    window.location.hash = hashForTab(tab);
  };

  const handleAccountNavigate = (view: 'menu' | 'saved') => {
    if (view === 'saved') {
      window.location.hash = 'results/account/saved';
    } else {
      window.history.back();
    }
  };

  const showBottomNav = currentScreen === 'results';

  return (
    <>
      {currentScreen === 'loading' && <Loading />}
      {currentScreen === 'input' && (
        <>
          <Input onGenerate={handleGenerate} />
          <Footer />
        </>
      )}
      {currentScreen === 'results' && (
        <div className="relative flex">
          <DesktopSidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onRequestLogin={() => setShowLoginModal(true)}
          />
          <div className="flex-1 min-w-0">
            {activeTab === 'home' && (
              <>
                <Results
                  outfits={selectedOutfits}
                  context={context}
                  onBack={handleBack}
                  onGenerate={handleGenerate}
                  onRequestLogin={() => setShowLoginModal(true)}
                />
                <Footer />
              </>
            )}
            {activeTab === 'mens-ranking' && (
              <div className="min-h-screen bg-white">
                <RankingPage gender="MALE" onRequestLogin={() => setShowLoginModal(true)} />
                <Footer />
              </div>
            )}
            {activeTab === 'womens-ranking' && (
              <div className="min-h-screen bg-white">
                <RankingPage gender="FEMALE" onRequestLogin={() => setShowLoginModal(true)} />
                <Footer />
              </div>
            )}
            {activeTab === 'account' && (
              <div className="min-h-screen bg-white">
                <MyAccountPage
                  onRequestLogin={() => setShowLoginModal(true)}
                  view={accountView}
                  onNavigate={handleAccountNavigate}
                />
                <Footer />
              </div>
            )}
          </div>
          {showBottomNav && <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />}
        </div>
      )}
      {currentScreen === 'admin' && (
        <AdminLayout>
          <AdminPins />
        </AdminLayout>
      )}
      {currentScreen === 'admin-products' && (
        <AdminLayout>
          <AdminProducts />
        </AdminLayout>
      )}
      {currentScreen === 'admin-users' && (
        <AdminLayout>
          <AdminUsers />
        </AdminLayout>
      )}
      {currentScreen === 'test-gemini' && <GeminiKeyTest />}
      {currentScreen === 'privacy-policy' && <PrivacyPolicy />}
      {currentScreen === 'terms-of-service' && <TermsOfService />}
      {currentScreen === 'affiliate-disclosure' && <AffiliateDisclosure />}
      {currentScreen === 'dmca-policy' && <DMCAPolicy />}
      {currentScreen === 'accessibility' && <Accessibility />}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </>
  );
}

export default App;
