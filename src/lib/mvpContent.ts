export type NoticeVisibility = 'public' | 'private';

export type NoticeAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export type AdminNotice = {
  id: string;
  title: string;
  date: string;
  content: string[];
  contentHtml?: string;
  visibility?: NoticeVisibility;
  attachments?: NoticeAttachment[];
};

export type AdminSchedule = {
  id: string;
  date: string;
  title: string;
  description: string;
  status: string;
};

const NOTICE_KEY = 'gunsan-tt-admin-notices';
const SCHEDULE_KEY = 'gunsan-tt-admin-schedules';
export const CONTENT_CHANGE_EVENT = 'gunsan-tt-content-change';

function emitChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CONTENT_CHANGE_EVENT));
}

export function getAdminNotices(): AdminNotice[] {
  if (typeof window === 'undefined') return [];
  try {
    const items = JSON.parse(localStorage.getItem(NOTICE_KEY) ?? '[]') as AdminNotice[];
    return items.map((item) => ({
      ...item,
      visibility: item.visibility ?? 'public',
      attachments: item.attachments ?? [],
    }));
  } catch {
    return [];
  }
}

export function saveAdminNotice(input: Omit<AdminNotice, 'id'>) {
  const item: AdminNotice = {
    ...input,
    id: `admin-${Date.now()}`,
    visibility: input.visibility ?? 'public',
    attachments: input.attachments ?? [],
  };
  const items = [item, ...getAdminNotices()];
  localStorage.setItem(NOTICE_KEY, JSON.stringify(items));
  emitChange();
  return item;
}

export function getAdminSchedules(): AdminSchedule[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(SCHEDULE_KEY) ?? '[]') as AdminSchedule[];
  } catch {
    return [];
  }
}

export function saveAdminSchedule(input: Omit<AdminSchedule, 'id'>) {
  const item: AdminSchedule = { ...input, id: `schedule-${Date.now()}` };
  const items = [item, ...getAdminSchedules()];
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(items));
  emitChange();
  return item;
}
