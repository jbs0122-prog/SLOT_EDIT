import { supabase } from './supabase';

export async function removeBackground(imageUrl: string, productId?: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Admin authentication required');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remove-bg`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageUrl, productId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to remove background');
  }

  const result = await response.json();
  return result.url || result.image;
}
