import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { createAdminServerSupabase } from '@/lib/supabase/server';
import { hasAdminSession } from '@/lib/adminSession';
import type { MvpUser } from '@/lib/mvpAuth';

export const MEMBER_COOKIE = 'gunsan-tt-member-session';
export const TITLES = ['', '협회장', '이사', '총무', '고문'] as const;

export function db() {
  const client = createAdminServerSupabase();
  if (!client) throw new Error('SUPABASE_SERVICE_ROLE_KEY와 NEXT_PUBLIC_SUPABASE_URL을 설정해주세요.');
  return client;
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

export function memberToken(id: string) {
  return id + '.' + createHmac('sha256', secret()).update(id).digest('hex');
}

function verifyToken(value: string | undefined) {
  if (!value) return null;
  const [id, signature, extra] = value.split('.');
  if (extra || !/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f]{64}$/.test(signature)) return null;
  const expected = createHmac('sha256', secret()).update(id).digest('hex');
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex')) ? id : null;
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
  const id = verifyToken((await cookies()).get(MEMBER_COOKIE)?.value);
  if (!id) return null;
  const { data, error } = await db().from('mvp_members').select('*').eq('id', id).single();
  if (error || !data || data.member_status !== 'active') return null;
  return { admin: false as const, user: publicMember(data) };
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
