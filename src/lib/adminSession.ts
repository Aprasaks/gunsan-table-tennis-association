import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'gunsan-tt-admin-session';

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? '';
}

function sign(username: string) {
  const secret = sessionSecret();
  if (!secret) return '';
  return createHmac('sha256', secret).update(username).digest('hex');
}

export function createAdminSessionToken(username: string) {
  const signature = sign(username);
  if (!signature) return '';
  return username + '.' + signature;
}

export function verifyAdminSessionToken(token: string | undefined) {
  if (!token) return false;
  const separator = token.lastIndexOf('.');
  if (separator < 1) return false;
  const username = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expectedUsername = process.env.ADMIN_USERNAME ?? 'admin';
  if (username !== expectedUsername) return false;
  const expected = sign(username);
  if (!expected || signature.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

export async function hasAdminSession() {
  const store = await cookies();
  return verifyAdminSessionToken(store.get(ADMIN_COOKIE_NAME)?.value);
}
