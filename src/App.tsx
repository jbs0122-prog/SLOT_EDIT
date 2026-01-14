import { useState, useEffect } from 'react';
import Input from './screens/Input';
import Results from './screens/Results';
import Loading from './screens/Loading';
import { Outfit } from './data/outfits';
import { fetchOutfits } from './utils/outfitService';
import { WeatherData } from './utils/weather';

type Screen = 'loading' | 'input' | 'results';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('loading');
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedOutfits, setSelectedOutfits] = useState<Outfit[]>([]);
  const [context, setContext] = useState({
    where: '',
    style: '',
    subToggle: null as string | null,
    weather: null as WeatherData | null,
  });

  useEffect(() => {
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
  }, []);

  const normalizeString = (str: string): string => {
    return str.trim().toLowerCase();
  };

  const handleGenerate = (where: string, style: string, subToggle: string | null, weather: WeatherData) => {
    console.log('Generating outfits for:', { where, style });

    const normalizedWhere = normalizeString(where);
    const normalizedStyle = normalizeString(style);

    const matches = outfits.filter(outfit => {
      const matchesWhere = normalizeString(outfit.where) === normalizedWhere;
      const matchesStyle = normalizeString(outfit.style) === normalizedStyle;
      console.log('Checking outfit:', {
        outfit: `${outfit.where} - ${outfit.style}`,
        matchesWhere,
        matchesStyle,
        normalizedWhere,
        normalizedStyle
      });
      return matchesWhere && matchesStyle;
    });

    console.log('Matches found:', matches.length);

    const results = matches.length > 0
      ? matches.slice(0, 3)
      : [];

    setSelectedOutfits(results);
    setContext({ where, style, subToggle, weather });
    setCurrentScreen('results');
  };

  const handleBack = () => {
    setCurrentScreen('input');
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
        />
      )}
    </>
  );
}

export default App;
