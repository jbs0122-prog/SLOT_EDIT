import { useState, useEffect } from 'react';
import Input from './screens/Input';
import Results from './screens/Results';
import Loading from './screens/Loading';
import AdminPins from './screens/AdminPins';
import AdminProducts from './screens/AdminProducts';
import AdminLayout from './screens/AdminLayout';
import BottomNav, { NavTab } from './screens/BottomNav';
import RankingPage from './screens/RankingPage';
import MyAccountPage from './screens/MyAccountPage';
import LoginModal from './screens/LoginModal';
import { Outfit } from './data/outfits';
import { fetchOutfits } from './utils/outfitService';
import { WeatherData, getSeasonsFromTemperature } from './utils/weather';

type Screen = 'loading' | 'input' | 'results' | 'admin' | 'admin-products';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('loading');
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedOutfits, setSelectedOutfits] = useState<Outfit[]>([]);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [context, setContext] = useState({
    gender: '',
    bodyType: '',
    vibe: '',
    weather: null as WeatherData | null,
  });

  useEffect(() => {
    if (window.location.hash === '#admin') {
      setCurrentScreen('admin');
      return;
    }
    if (window.location.hash === '#admin-products') {
      setCurrentScreen('admin-products');
      return;
    }

    const loadOutfits = async () => {
      try {
        const data = await fetchOutfits();
        setOutfits(data);
        setCurrentScreen('input');
      } catch (error) {
        console.error('Failed to load outfits:', error);
        setCurrentScreen('input');
      }
    };

    loadOutfits();

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.screen) {
        setCurrentScreen(event.state.screen);
      } else {
        setCurrentScreen('input');
      }
    };

    window.addEventListener('popstate', handlePopState);

    if (!window.history.state || !window.history.state.screen) {
      window.history.replaceState({ screen: 'input' }, '', window.location.href);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const normalizeString = (str: string): string => {
    return str.trim().toLowerCase().replace(/_/g, ' ');
  };

  const handleGenerate = (gender: string, bodyType: string, vibe: string, weather: WeatherData) => {
    const normalizedGender = normalizeString(gender);
    const normalizedBodyType = normalizeString(bodyType);
    const normalizedVibe = normalizeString(vibe);
    const weatherSeasons = getSeasonsFromTemperature(weather.temperature);

    const matches = outfits.filter(outfit => {
      const matchesGender = normalizeString(outfit.gender) === normalizedGender;
      const matchesBodyType = normalizeString(outfit.body_type) === normalizedBodyType;
      const matchesVibe = normalizeString(outfit.vibe) === normalizedVibe;

      if (!matchesGender || !matchesBodyType || !matchesVibe) return false;

      if (outfit.items && outfit.items.length > 0) {
        const productsWithSeasons = outfit.items.filter(
          item => item.product?.season && item.product.season.length > 0
        );
        if (productsWithSeasons.length > 0) {
          const commonSeasons = productsWithSeasons.reduce<string[]>((acc, item) => {
            const productSeasons = item.product!.season;
            return acc.filter(s => productSeasons.includes(s));
          }, [...productsWithSeasons[0].product!.season]);

          if (commonSeasons.length > 0) {
            return weatherSeasons.some(s => commonSeasons.includes(s));
          }
        }
      }

      return true;
    });

    setSelectedOutfits(matches);
    setContext({ gender, bodyType, vibe, weather });
    setActiveTab('home');

    window.history.pushState({ screen: 'results' }, '', window.location.href);
    setCurrentScreen('results');
  };

  const handleBack = () => {
    if (currentScreen === 'results') {
      setCurrentScreen('input');
      window.history.back();
    } else {
      window.history.back();
    }
  };

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
  };

  const showBottomNav = currentScreen === 'results';

  return (
    <>
      {currentScreen === 'loading' && <Loading />}
      {currentScreen === 'input' && <Input onGenerate={handleGenerate} />}
      {currentScreen === 'results' && (
        <div className="relative">
          {activeTab === 'home' && (
            <Results
              outfits={selectedOutfits}
              context={context}
              onBack={handleBack}
              onGenerate={handleGenerate}
              onRequestLogin={() => setShowLoginModal(true)}
            />
          )}
          {activeTab === 'mens-ranking' && (
            <div className="min-h-screen bg-white">
              <RankingPage gender="MALE" onRequestLogin={() => setShowLoginModal(true)} />
            </div>
          )}
          {activeTab === 'womens-ranking' && (
            <div className="min-h-screen bg-white">
              <RankingPage gender="FEMALE" onRequestLogin={() => setShowLoginModal(true)} />
            </div>
          )}
          {activeTab === 'account' && (
            <div className="min-h-screen bg-white">
              <MyAccountPage onRequestLogin={() => setShowLoginModal(true)} />
            </div>
          )}
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
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </>
  );
}

export default App;
