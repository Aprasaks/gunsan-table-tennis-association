export type TournamentStatus = '예정' | '접수중' | '마감' | '종료';
export type TournamentVisibility = 'public' | 'private';
export type TournamentFileKind = 'guideline_image' | 'attachment';

export type TournamentFile = {
  id: string;
  fileName: string;
  fileType: string;
  mimeType: string | null;
  fileKind: TournamentFileKind;
  storagePath: string;
  publicUrl: string;
  sortOrder: number;
};

export type Tournament = {
  id: string;
  title: string;
  eventStartDate: string;
  eventEndDate: string | null;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  venue: string;
  status: TournamentStatus;
  sourceUrl: string | null;
  visibility: TournamentVisibility;
  createdAt: string;
  updatedAt: string;
  files: TournamentFile[];
};

export function formatShortDateRange(start: string | null, end: string | null) {
  if (!start) return '-';
  const startDate = new Date(start + 'T00:00:00');
  const endDate = end ? new Date(end + 'T00:00:00') : null;
  const startText = String(startDate.getMonth() + 1).padStart(2, '0') + '.' + String(startDate.getDate()).padStart(2, '0');
  if (!endDate || start === end) return startText;
  if (startDate.getMonth() === endDate.getMonth()) {
    return startText + ' ~ ' + String(endDate.getDate()).padStart(2, '0');
  }
  return startText + ' ~ ' + String(endDate.getMonth() + 1).padStart(2, '0') + '.' + String(endDate.getDate()).padStart(2, '0');
}

export function formatFullDateRange(start: string | null, end: string | null) {
  if (!start) return '-';
  if (!end || start === end) return start;
  return start + ' ~ ' + end;
}
