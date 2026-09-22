export type BoardAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

export type BoardPost = {
  id: string;
  title: string;
  contentHtml: string;
  authorId: string;
  authorName: string;
  date: string;
  createdAt: string;
  attachments: BoardAttachment[];
};

const BOARD_KEY = 'gunsan-tt-board-posts';
export const BOARD_CHANGE_EVENT = 'gunsan-tt-board-change';

function emitChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(BOARD_CHANGE_EVENT));
}

export function getBoardPosts(): BoardPost[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(BOARD_KEY) ?? '[]') as BoardPost[];
  } catch {
    return [];
  }
}

export function saveBoardPost(input: Omit<BoardPost, 'id' | 'createdAt'>) {
  const post: BoardPost = {
    ...input,
    id: 'board-' + Date.now(),
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(BOARD_KEY, JSON.stringify([post, ...getBoardPosts()]));
  emitChange();
  return post;
}
