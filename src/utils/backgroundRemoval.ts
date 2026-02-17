export async function removeBackground(imageUrl: string, productId?: string): Promise<string> {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/remove-bg`;

  console.log(`Removing background for product ${productId || 'unnamed'}`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageUrl, productId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('Background removal failed:', {
      status: response.status,
      error,
      productId,
      imageUrl
    });
    throw new Error(error.error || error.details || 'Failed to remove background');
  }

  const result = await response.json();
  console.log(`Background removed successfully for product ${productId}`);
  return result.url || result.image;
}
