export type MemberStatus = 'active' | 'withdrawn';
export type UserRole = 'member' | 'admin';

export type MvpUser = {
  id: string;
  name: string;
  birthDate?: string;
  gender: '남' | '여' | '';
  phone: string;
  club: string;
  rank?: string;
  position: string;
  passwordHash: string;
  signatureDataUrl?: string;
  memberStatus?: MemberStatus;
  role?: UserRole;
  loginId?: string;
  associationTitle?: '' | '협회장' | '이사' | '총무' | '고문';
  createdAt?: string;
};

export type MvpSession = {
  userId: string;
  loggedInAt: string;
};

const USERS_KEY = 'gunsan-tt-mvp-users';
const SESSION_KEY = 'gunsan-tt-mvp-session';
export const AUTH_CHANGE_EVENT = 'gunsan-tt-auth-change';
export const ADMIN_USER_ID = 'admin-root';

const ADMIN_USER: MvpUser = {
  id: ADMIN_USER_ID,
  loginId: 'admin',
  name: '관리자',
  gender: '',
  phone: '',
  club: '군산시탁구협회',
  position: '관리자',
  passwordHash: '',
  memberStatus: 'active',
  role: 'admin',
};

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

export function isAdmin(user: MvpUser | null | undefined) {
  return user?.role === 'admin' || user?.id === ADMIN_USER_ID;
}

export function canReviewAssociation(user: MvpUser | null | undefined) {
  return isAdmin(user) || Boolean(user?.associationTitle && user.memberStatus !== 'withdrawn');
}

export function getUsers(): MvpUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]') as MvpUser[];
    return users.map((user) => ({
      ...user,
      memberStatus: user.memberStatus ?? 'active',
      role: user.role ?? 'member',
    }));
  } catch {
    return [];
  }
}

export function saveUsers(users: MvpUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  notifyAuthChange();
}

export function updateUserBasicInfo(
  userId: string,
  changes: Partial<Pick<MvpUser, 'name' | 'gender' | 'phone' | 'position' | 'passwordHash' | 'signatureDataUrl'>>,
) {
  const users = getUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index < 0) return null;

  users[index] = { ...users[index], ...changes };
  saveUsers(users);
  return users[index];
}

export function applyMembershipChange(
  userId: string,
  changes: Partial<Pick<MvpUser, 'club' | 'position' | 'memberStatus'>>,
) {
  const users = getUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index < 0) return null;

  users[index] = { ...users[index], ...changes };
  saveUsers(users);
  return users[index];
}

export function setSession(userId: string) {
  const session: MvpSession = { userId, loggedInAt: new Date().toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  notifyAuthChange();
}

export function setAdminSession() {
  setSession(ADMIN_USER_ID);
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
  if (session.userId === ADMIN_USER_ID) return ADMIN_USER;
  return getUsers().find((user) => user.id === session.userId) ?? null;
}

export async function refreshCurrentUser(): Promise<MvpUser | null> {
  const response = await fetch('/api/mvp/me', { cache: 'no-store' });
  if (!response.ok) return null;
  const result = await response.json() as { admin: boolean; user: MvpUser | null };
  if (result.admin) return ADMIN_USER;
  if (result.user) {
    saveUsers([result.user]);
    setSession(result.user.id);
  }
  return result.user;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  notifyAuthChange();
}
