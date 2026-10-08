import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'gunsan-tt-admin-session';
const ADMIN_SESSION_SECONDS = 60 * 60 * 12;

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? '';
}

function sign(payload: string) {
  const secret = sessionSecret();
  if (!secret) return '';
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function createAdminSessionToken(username: string) {
  const payload = username + '.' + Math.floor(Date.now() / 1000);
  const signature = sign(payload);
  if (!signature) return '';
  return payload + '.' + signature;
}

export function verifyAdminSessionToken(token: string | undefined) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [username, issuedAtString, signature] = parts;
  if (username !== (process.env.ADMIN_USERNAME ?? 'admin') ||
      !/^\d{10}$/.test(issuedAtString) || !/^[0-9a-f]{64}$/.test(signature)) return false;
  const issuedAt = Number(issuedAtString);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now + 60 || now - issuedAt > ADMIN_SESSION_SECONDS) return false;
  const expected = sign(username + '.' + issuedAtString);
  return Boolean(expected) && timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}

export async function hasAdminSession() {
  const store = await cookies();
  return verifyAdminSessionToken(store.get(ADMIN_COOKIE_NAME)?.value);
}
