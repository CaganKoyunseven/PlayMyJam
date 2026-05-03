import { createHmac } from 'crypto';
import { cookies } from 'next/headers';

// HMAC-SHA256 ile token üret — base64 gibi tersine çevrilemez.
// ADMIN_PASSWORD değişirse mevcut session'lar otomatik geçersiz olur.
export function buildAdminToken(username: string, password: string): string {
  return createHmac('sha256', password)
    .update(`pmj:${username}`)
    .digest('hex');
}

export async function isAdminAuthed(): Promise<boolean> {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get('pmj_admin')?.value;
  if (!token) return false;
  return token === buildAdminToken(username, password);
}
