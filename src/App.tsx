import { useState, useEffect } from 'react';
import Input from './screens/Input';
import Results from './screens/Results';
import Loading from './screens/Loading';
import AdminPins from './screens/AdminPins';
import AdminProducts from './screens/AdminProducts';
import AdminLayout from './screens/AdminLayout';
import { Outfit } from './data/outfits';
import { fetchOutfits } from './utils/outfitService';
import { WeatherData, getSeasonsFromTemperature } from './utils/weather';

type Screen = 'loading' | 'input' | 'results' | 'admin' | 'admin-products';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('loading');
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedOutfits, setSelectedOutfits] = useState<Outfit[]>([]);
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
      console.log('PopState event:', event.state);
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
    console.log('Switching to results screen with', matches.length, 'outfits');

    window.history.pushState({ screen: 'results' }, '', window.location.href);
    setCurrentScreen('results');
  };

  const handleBack = () => {
    console.log('Back button clicked, current screen:', currentScreen);
    if (currentScreen === 'results') {
      setCurrentScreen('input');
      window.history.back();
    } else {
      window.history.back();
    }
  };

  return (
    <>
      {currentScreen === 'loading' && <Loading />}
      {currentScreen === 'input' && <Input onGenerate={handleGenerate} />}
      {currentScreen === 'results' && (
        <Results
          outfits={selectedOutfits}
          context={context}
          onBack={handleBack}
          onGenerate={handleGenerate}
        />
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
    </>
  );
}

export default App;
