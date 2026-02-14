import { supabase } from './supabase';

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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Admin authentication required');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-fashion-image`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
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
