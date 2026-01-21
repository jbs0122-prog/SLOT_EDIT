import { useState, useEffect } from 'react';
import Input from './screens/Input';
import Results from './screens/Results';
import Loading from './screens/Loading';
import AdminPins from './screens/AdminPins';
import { Outfit } from './data/outfits';
import { fetchOutfits } from './utils/outfitService';
import { WeatherData } from './utils/weather';

type Screen = 'loading' | 'input' | 'results' | 'admin';

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
    window.history.replaceState({ screen: 'input' }, '', window.location.href);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const normalizeString = (str: string): string => {
    return str.trim().toLowerCase();
  };

  const handleGenerate = (gender: string, bodyType: string, vibe: string, weather: WeatherData) => {
    console.log('=== GENERATE BUTTON CLICKED ===');
    console.log('Total outfits loaded:', outfits.length);
    console.log('Generating outfits for:', { gender, bodyType, vibe });

    const normalizedGender = normalizeString(gender);
    const normalizedBodyType = normalizeString(bodyType);
    const normalizedVibe = normalizeString(vibe);

    const matches = outfits.filter(outfit => {
      const matchesGender = normalizeString(outfit.gender) === normalizedGender;
      const matchesBodyType = normalizeString(outfit.body_type) === normalizedBodyType;
      const matchesVibe = normalizeString(outfit.vibe) === normalizedVibe;
      console.log('Checking outfit:', {
        outfit: `${outfit.gender} - ${outfit.body_type} - ${outfit.vibe}`,
        matchesGender,
        matchesBodyType,
        matchesVibe,
        normalizedGender,
        normalizedBodyType,
        normalizedVibe
      });
      return matchesGender && matchesBodyType && matchesVibe;
    });

    console.log('Matches found:', matches.length);

    const results = matches.length > 0
      ? matches.slice(0, 3)
      : [];

    setSelectedOutfits(results);
    setContext({ gender, bodyType, vibe, weather });
    console.log('Switching to results screen with', results.length, 'outfits');
    setCurrentScreen('results');
    window.history.pushState({ screen: 'results' }, '', window.location.href);
  };

  const handleBack = () => {
    setCurrentScreen('input');
    window.history.pushState({ screen: 'input' }, '', window.location.href);
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
      {currentScreen === 'admin' && <AdminPins />}
    </>
  );
}

export default App;
