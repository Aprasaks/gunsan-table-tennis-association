export type TransferStatus = 'pending_admin' | 'approved' | 'rejected';

export type TransferRequest = {
  id: string;
  memberId: string;
  memberName: string;
  gender: '남' | '여';
  rank: string;
  phone: string;
  fromClub: string;
  toClub: string;
  sourceChairUserId: string;
  sourceChairName: string;
  sourceChairSignatureDataUrl: string;
  requestDate: string;
  requestedAt: string;
  status: TransferStatus;
  processedAt?: string;
  adminNote?: string;
};

const TRANSFER_KEY = 'gunsan-tt-transfer-requests';
export const TRANSFER_CHANGE_EVENT = 'gunsan-tt-transfer-change';

function emitChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(TRANSFER_CHANGE_EVENT));
}

export function getTransferRequests(): TransferRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(TRANSFER_KEY) ?? '[]') as TransferRequest[];
  } catch {
    return [];
  }
}

export function saveTransferRequest(input: Omit<TransferRequest, 'id' | 'requestedAt' | 'status'>) {
  const item: TransferRequest = {
    ...input,
    id: 'transfer-' + Date.now(),
    requestedAt: new Date().toISOString(),
    status: 'pending_admin',
  };
  localStorage.setItem(TRANSFER_KEY, JSON.stringify([item, ...getTransferRequests()]));
  emitChange();
  return item;
}

export function updateTransferRequest(
  id: string,
  changes: Partial<Pick<TransferRequest, 'status' | 'processedAt' | 'adminNote'>>,
) {
  const items = getTransferRequests();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  items[index] = { ...items[index], ...changes };
  localStorage.setItem(TRANSFER_KEY, JSON.stringify(items));
  emitChange();
  return items[index];
}
