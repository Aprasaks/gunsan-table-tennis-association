import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { createAdminServerSupabase } from '@/lib/supabase/server';
import { hasAdminSession } from '@/lib/adminSession';
import type { MvpUser } from '@/lib/mvpAuth';

export const MEMBER_COOKIE = 'gunsan-tt-member-session';
export const MEMBER_SESSION_SECONDS = 60 * 60 * 12;
export const TITLES = ['', '협회장', '이사', '총무', '고문', '사무국장'] as const;

export function db() {
  const client = createAdminServerSupabase();
  if (!client) throw new Error('SUPABASE_SERVICE_ROLE_KEY와 NEXT_PUBLIC_SUPABASE_URL을 설정해주세요.');
  return client;
}

export function logServerError(context: string, error: unknown) {
  console.error(context, error instanceof Error ? { message: error.message, stack: error.stack } : error);
}

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD;
  if (!value) throw new Error('ADMIN_SESSION_SECRET 또는 ADMIN_PASSWORD를 설정해주세요.');
  return value;
}

export function passwordDigest(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}

export function passwordMatches(password: string, saved: string) {
  if (/^[0-9a-f]{64}$/.test(saved)) {
    const actual = createHash('sha256').update(password).digest('hex');
    return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(saved, 'hex'));
  }
  const [salt, hash] = saved.split(':');
  if (!salt || !hash || hash.length !== 128) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}

export function memberToken(id: string, passwordHash: string) {
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const payload = id + '.' + issuedAt;
  const signature = createHmac('sha256', secret()).update(payload + '.' + passwordHash).digest('hex');
  return payload + '.' + signature;
}

function parseMemberToken(value: string | undefined) {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [id, issuedAtString, signature] = parts;
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^\\d{10}$/.test(issuedAtString) || !/^[0-9a-f]{64}$/.test(signature)) return null;
  const issuedAt = Number(issuedAtString);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now + 60 || now - issuedAt > MEMBER_SESSION_SECONDS) return null;
  return { id, issuedAtString, signature };
}

export function publicMember(row: Record<string, any>): MvpUser {
  return {
    id: row.id, name: row.name, birthDate: row.birth_date, gender: row.gender,
    phone: row.phone, club: row.club, rank: row.rank, position: row.position,
    associationTitle: row.association_title, memberStatus: row.member_status,
    createdAt: row.created_at,
    signatureDataUrl: row.signature_data_url ?? undefined, passwordHash: '',
    role: 'member',
  };
}

export async function actor() {
  if (await hasAdminSession()) return { admin: true as const, user: null };
  const token = parseMemberToken((await cookies()).get(MEMBER_COOKIE)?.value);
  if (!token) return null;
  const { data, error } = await db().from('mvp_members').select('*').eq('id', token.id).single();
  if (error || !data || data.member_status !== 'active') return null;
  const expected = createHmac('sha256', secret())
    .update(token.id + '.' + token.issuedAtString + '.' + data.password_hash).digest('hex');
  if (!timingSafeEqual(Buffer.from(token.signature, 'hex'), Buffer.from(expected, 'hex'))) return null;
  return { admin: false as const, user: publicMember(data) };
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
