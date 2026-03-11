import { useState, useEffect, useRef } from 'react';
import Input from './screens/Input';
import Results from './screens/Results';
import Loading from './screens/Loading';
import GeneratingLoading from './screens/GeneratingLoading';
import AdminPins from './screens/AdminPins';
import AdminProducts from './screens/AdminProducts';
import AdminOutfitLinker from './screens/AdminOutfitLinker';
import AdminUsers from './screens/AdminUsers';
import AdminLayout from './screens/AdminLayout';
import AdminAmazonSearch from './screens/AdminAmazonSearch';
import AdminSmartSearch from './screens/AdminSmartSearch';
import AdminAutoPipeline from './screens/AdminAutoPipeline';
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
import { fetchOutfits, fetchOutfitById } from './utils/outfitService';
import { WeatherData, getSeasonsFromTemperature, getTargetWarmth } from './utils/weather';

type Screen = 'loading' | 'input' | 'generating' | 'results' | 'admin' | 'admin-products' | 'admin-outfit-linker' | 'admin-users' | 'admin-amazon' | 'admin-smart' | 'admin-auto-pipeline' | 'test-gemini' | 'privacy-policy' | 'terms-of-service' | 'affiliate-disclosure' | 'dmca-policy' | 'accessibility';

const RESULTS_KEY = 'slotedit_results';

function getHash(): string {
  return window.location.hash.replace('#', '');
}

function screenFromHash(h: string): Screen {
  if (h === 'admin') return 'admin';
  if (h === 'admin-products') return 'admin-products';
  if (h === 'admin-outfit-linker') return 'admin-outfit-linker';
  if (h === 'admin-users') return 'admin-users';
  if (h === 'admin-amazon') return 'admin-amazon';
  if (h === 'admin-smart') return 'admin-smart';
  if (h === 'admin-auto-pipeline') return 'admin-auto-pipeline';
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

function sharedLookIdFromHash(h: string): string | null {
  const match = h.match(/^results\/look\/(.+)$/);
  return match ? match[1] : null;
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
  return str.trim().toLowerCase().replace(/[_-]/g, ' ');
}

function computeSeasonFit(outfit: Outfit, weatherSeasons: string[]): number {
  if (!outfit.items || outfit.items.length === 0) return 0;

  const productsWithSeasons = outfit.items.filter(
    item => item.product?.season && item.product.season.length > 0
  );
  if (productsWithSeasons.length === 0) return 5;

  const matchingCount = productsWithSeasons.filter(item => {
    const productSeasons = item.product!.season;
    return weatherSeasons.some(s => productSeasons.includes(s));
  }).length;

  return (matchingCount / productsWithSeasons.length) * 10;
}

function computeOutfitWarmthScore(outfit: Outfit): number | undefined {
  if (!outfit.items || outfit.items.length === 0) return undefined;
  const CLOTHING = ['outer', 'mid', 'top', 'bottom'];
  const SHOES_WEIGHT = 0.4;
  let sum = 0; let weight = 0;
  for (const item of outfit.items) {
    const w = item.product?.warmth;
    if (typeof w !== 'number') continue;
    if (CLOTHING.includes(item.slot_type)) { sum += w; weight += 1; }
    else if (item.slot_type === 'shoes') { sum += w * SHOES_WEIGHT; weight += SHOES_WEIGHT; }
  }
  return weight > 0 ? sum / weight : undefined;
}

function computeWeatherFit(outfit: Outfit, targetWarmth: number, isWetWeather: boolean, weatherSeasons: string[]): number {
  let score = 0;
  if (!outfit.items || outfit.items.length === 0) return 0;

  const avgWarmth = computeOutfitWarmthScore(outfit);
  if (avgWarmth !== undefined) {
    const diff = Math.abs(avgWarmth - targetWarmth);
    if (diff <= 0.3) score += 10;
    else if (diff <= 0.6) score += 8;
    else if (diff <= 1.0) score += 5;
    else if (diff <= 1.5) score += 2;
    else score -= Math.min(8, (diff - 1.5) * 4);
  }

  score += computeSeasonFit(outfit, weatherSeasons);

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
  const isAdmin = initialHash.startsWith('admin') || initialHash === 'admin-amazon' || initialHash === 'admin-smart' || initialHash === 'admin-outfit-linker' || initialHash === 'admin-auto-pipeline';

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
          const sharedId = sharedLookIdFromHash(h);
          if (sharedId) {
            let target = data.find(o => o.id === sharedId);
            if (!target) {
              const fetched = await fetchOutfitById(sharedId);
              if (!fetched) {
                window.location.hash = '';
                setCurrentScreen('input');
                return;
              }
              target = fetched;
            }
            const g = normalizeString(target.gender);
            const b = normalizeString(target.body_type);
            const v = normalizeString(target.vibe);
            const allMatching = data.filter(o =>
              normalizeString(o.gender) === g &&
              normalizeString(o.body_type) === b &&
              normalizeString(o.vibe) === v
            );
            if (!allMatching.find(o => o.id === target!.id)) {
              allMatching.unshift(target);
            }
            setSelectedOutfits(allMatching);
            setContext({ gender: target.gender, bodyType: target.body_type, vibe: target.vibe, weather: null });
            setCurrentScreen('results');
            setActiveTab('home');
            return;
          }

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
    const handler = async () => {
      const h = getHash();
      const screen = screenFromHash(h);

      if (screen === 'results') {
        const sharedId = sharedLookIdFromHash(h);
        if (sharedId && selectedOutfitsRef.current.every(o => o.id !== sharedId)) {
          const target = await fetchOutfitById(sharedId);
          if (target) {
            const g = normalizeString(target.gender);
            const b = normalizeString(target.body_type);
            const v = normalizeString(target.vibe);
            const allMatching = outfits.filter(o =>
              normalizeString(o.gender) === g &&
              normalizeString(o.body_type) === b &&
              normalizeString(o.vibe) === v
            );
            if (!allMatching.find(o => o.id === target.id)) {
              allMatching.unshift(target);
            }
            setSelectedOutfits(allMatching);
            setContext({ gender: target.gender, bodyType: target.body_type, vibe: target.vibe, weather: null });
            setActiveTab('home');
            setCurrentScreen('results');
            return;
          }
          window.location.hash = '';
          return;
        }

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

  const handleGenerate = async (gender: string, bodyType: string, vibe: string, weather: WeatherData) => {
    const normalizedGender = normalizeString(gender);
    const normalizedBodyType = normalizeString(bodyType);
    const normalizedVibe = normalizeString(vibe);
    const weatherSeasons = getSeasonsFromTemperature(weather.temperature);
    const isCold = weather.temperature < 40;
    const isWetWeather = weather.condition === 'Rainy' || weather.condition === 'Snow';
    const targetWarmth = getTargetWarmth(weather.temperature);

    let outfitPool = outfits;
    if (outfitPool.length === 0) {
      try {
        const { fetchOutfits: load } = await import('./utils/outfitService');
        outfitPool = await load();
        setOutfits(outfitPool);
      } catch { /* use empty */ }
    }

    const matches = outfitPool.filter(outfit => {
      const matchesGender = normalizeString(outfit.gender) === normalizedGender;
      const matchesBodyType = normalizeString(outfit.body_type) === normalizedBodyType;
      const matchesVibe = normalizeString(outfit.vibe) === normalizedVibe;

      if (!matchesGender || !matchesBodyType || !matchesVibe) return false;

      const hasOuter = outfit.items?.some(item => item.slot_type === 'outer');
      if (isCold && !hasOuter) return false;

      const outfitWarmth = computeOutfitWarmthScore(outfit);
      if (outfitWarmth !== undefined) {
        const diff = Math.abs(outfitWarmth - targetWarmth);
        if (diff > 2.0) return false;
      }

      return true;
    });

    const sorted = [...matches].sort((a, b) => {
      return computeWeatherFit(b, targetWarmth, isWetWeather, weatherSeasons) - computeWeatherFit(a, targetWarmth, isWetWeather, weatherSeasons);
    });

    const ctx = { gender, bodyType, vibe, weather };
    setSelectedOutfits(sorted);
    setContext(ctx);
    setActiveTab('home');
    setCurrentScreen('generating');

    const imageUrls: string[] = [];
    sorted.slice(0, 5).forEach(outfit => {
      if (outfit.image_url_flatlay) imageUrls.push(outfit.image_url_flatlay);
      if (outfit.image_url_on_model) imageUrls.push(outfit.image_url_on_model);
      if (outfit.image_url_flatlay_clean) imageUrls.push(outfit.image_url_flatlay_clean);
    });

    const MIN_DISPLAY_MS = 1800;
    const MAX_WAIT_MS = 4000;
    const startTime = Date.now();

    const preloadImage = (url: string) =>
      new Promise<void>(resolve => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      });

    const preloadAll = Promise.all(imageUrls.map(preloadImage));
    const timeout = new Promise<void>(resolve => setTimeout(resolve, MAX_WAIT_MS));

    await Promise.race([preloadAll, timeout]);

    const elapsed = Date.now() - startTime;
    if (elapsed < MIN_DISPLAY_MS) {
      await new Promise(resolve => setTimeout(resolve, MIN_DISPLAY_MS - elapsed));
    }

    persistResults(sorted, ctx);

    const currentHash = getHash();
    if (!currentHash.startsWith('results')) {
      window.location.hash = 'results';
    }

    setCurrentScreen('results');
  };

  const handleBack = () => {
    window.location.hash = '';
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
      {currentScreen === 'generating' && <GeneratingLoading />}
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
              <Results
                outfits={selectedOutfits}
                context={context}
                onBack={handleBack}
                onGenerate={handleGenerate}
                onRequestLogin={() => setShowLoginModal(true)}
                footer={<Footer />}
              />
            )}
            {activeTab === 'mens-ranking' && (
              <div className="h-screen overflow-y-auto bg-white">
                <RankingPage gender="MALE" onRequestLogin={() => setShowLoginModal(true)} />
                <Footer />
              </div>
            )}
            {activeTab === 'womens-ranking' && (
              <div className="h-screen overflow-y-auto bg-white">
                <RankingPage gender="FEMALE" onRequestLogin={() => setShowLoginModal(true)} />
                <Footer />
              </div>
            )}
            {activeTab === 'account' && (
              <div className="h-screen overflow-y-auto bg-white">
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
        <AdminLayout currentPage="pins">
          <AdminPins />
        </AdminLayout>
      )}
      {currentScreen === 'admin-products' && (
        <AdminLayout currentPage="products">
          <AdminProducts />
        </AdminLayout>
      )}
      {currentScreen === 'admin-outfit-linker' && (
        <AdminLayout currentPage="outfit-linker">
          <AdminOutfitLinker />
        </AdminLayout>
      )}
      {currentScreen === 'admin-users' && (
        <AdminLayout currentPage="users">
          <AdminUsers />
        </AdminLayout>
      )}
      {currentScreen === 'admin-amazon' && (
        <AdminLayout currentPage="amazon-search">
          <AdminAmazonSearch />
        </AdminLayout>
      )}
      {currentScreen === 'admin-smart' && (
        <AdminLayout currentPage="smart-search">
          <AdminSmartSearch />
        </AdminLayout>
      )}
      {currentScreen === 'admin-auto-pipeline' && (
        <AdminLayout currentPage="auto-pipeline">
          <AdminAutoPipeline />
        </AdminLayout>
      )}
      {currentScreen === 'test-gemini' && (
        <AdminLayout currentPage="api-test">
          <GeminiKeyTest />
        </AdminLayout>
      )}
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
