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
  updatedAt?: string;
  attachments: BoardAttachment[];
};

const BOARD_KEY = 'gunsan-tt-board-posts';
export const BOARD_CHANGE_EVENT = 'gunsan-tt-board-change';

function emitChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(BOARD_CHANGE_EVENT));
}

function savePosts(posts: BoardPost[]) {
  localStorage.setItem(BOARD_KEY, JSON.stringify(posts));
  emitChange();
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
  savePosts([post, ...getBoardPosts()]);
  return post;
}

export function updateBoardPost(
  id: string,
  authorId: string,
  changes: Partial<Pick<BoardPost, 'title' | 'contentHtml' | 'attachments'>>,
) {
  const posts = getBoardPosts();
  const index = posts.findIndex((post) => post.id === id);
  if (index < 0 || posts[index].authorId !== authorId) return null;

  posts[index] = {
    ...posts[index],
    ...changes,
    updatedAt: new Date().toISOString(),
  };
  savePosts(posts);
  return posts[index];
}

export function deleteBoardPost(id: string, requesterId: string, admin = false) {
  const posts = getBoardPosts();
  const target = posts.find((post) => post.id === id);
  if (!target) return false;
  if (!admin && target.authorId !== requesterId) return false;

  savePosts(posts.filter((post) => post.id !== id));
  return true;
}
