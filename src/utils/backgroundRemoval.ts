export async function removeBackground(imageUrl: string, productId?: string): Promise<string> {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remove-bg`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageUrl, productId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove background');
  }

  const result = await response.json();
  return result.url || result.image;
}
