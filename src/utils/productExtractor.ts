import { supabase } from './supabase';

export interface DetectedItem {
  slot: string;
  label: string;
  color: string;
  description: string;
}

export interface ExtractedProduct {
  imageUrl: string;
  slot: string;
  label: string;
}

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-products`;

async function getAdminHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Admin authentication required');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export async function detectItemsInPhoto(imageUrl: string): Promise<DetectedItem[]> {
  const headers = await getAdminHeaders();
  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ mode: 'detect', imageUrl }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 403) {
      throw new Error('관리자 권한이 필요합니다. 로그아웃 후 관리자 계정으로 다시 로그인해주세요.');
    }
    throw new Error(err.error || `요청 실패 (상태: ${response.status})`);
  }

  const data = await response.json();
  if (!data.success) throw new Error('아이템 감지에 실패했습니다');
  return data.items;
}

export async function extractProductImage(
  imageUrl: string,
  slot: string,
  label: string
): Promise<ExtractedProduct> {
  const headers = await getAdminHeaders();
  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ mode: 'extract', imageUrl, slot, label }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 403) {
      throw new Error('관리자 권한이 필요합니다. 로그아웃 후 관리자 계정으로 다시 로그인해주세요.');
    }
    throw new Error(err.error || `제품 추출 실패 (상태: ${response.status})`);
  }

  const data = await response.json();
  if (!data.success) throw new Error('제품 추출에 실패했습니다');
  return { imageUrl: data.imageUrl, slot: data.slot, label: data.label };
}
