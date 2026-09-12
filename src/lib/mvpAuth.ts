export type MvpUser = {
  id: string;
  name: string;
  gender: '남' | '여';
  phone: string;
  club: string;
  position: string;
  passwordHash: string;
};

export type MvpSession = {
  userId: string;
  loggedInAt: string;
};

const USERS_KEY = 'gunsan-tt-mvp-users';
const SESSION_KEY = 'gunsan-tt-mvp-session';
export const AUTH_CHANGE_EVENT = 'gunsan-tt-auth-change';

function notifyAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

export function normalizePhone(phone: string) {
  return phone.replace(/[^0-9]/g, '');
}

export async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function getUsers(): MvpUser[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]') as MvpUser[];
  } catch {
    return [];
  }
}

export function saveUsers(users: MvpUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function setSession(userId: string) {
  const session: MvpSession = { userId, loggedInAt: new Date().toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  notifyAuthChange();
}

export function getSession(): MvpSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as MvpSession : null;
  } catch {
    return null;
  }
}

export function getCurrentUser(): MvpUser | null {
  const session = getSession();
  if (!session) return null;
  return getUsers().find((user) => user.id === session.userId) ?? null;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  notifyAuthChange();
}
