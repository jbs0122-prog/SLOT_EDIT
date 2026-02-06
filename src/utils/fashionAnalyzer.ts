export interface ProductAnalysis {
  category: string;
  sub_category: string;
  gender: string;
  color: string;
  color_family: string;
  color_tone: string;
  pattern: string;
  material: string;
  silhouette: string;
  vibe: string[];
  season: string[];
  formality: number;
  warmth: number;
  description: string;
}

export async function analyzeFashionImage(
  imageUrl: string,
  analysisType: 'product' | 'outfit' | 'style' = 'product'
): Promise<ProductAnalysis> {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-fashion-image`;

  const headers = {
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ imageUrl, analysisType }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to analyze image');
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error('Analysis failed');
  }

  return data.analysis;
}
