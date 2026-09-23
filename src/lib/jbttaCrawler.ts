import { randomUUID } from 'node:crypto';
import * as cheerio from 'cheerio';
import { documentText, open } from 'js-hwp';
import { createAdminServerSupabase } from '@/lib/supabase/server';
import type { TournamentStatus, TournamentFileKind } from '@/lib/tournaments';

const SOURCE_ORIGIN = 'http://jbtta.pingpongkorea.com';
const SOURCE_BOARD = SOURCE_ORIGIN + '/bbs/board.php?bo_table=community_09';
const USER_AGENT = 'Mozilla/5.0 (compatible; GunsanTableTennisAssociation/1.0; +https://gunsan-table-tennis-association.vercel.app/)';

type Candidate = {
  wrId: string;
  title: string;
  url: string;
  region?: string;
};

const JEONBUK_AREAS = ['전주시','군산시','익산시','정읍시','남원시','김제시','완주군','진안군','무주군','장수군','임실군','순창군','고창군','부안군'];

type ParsedDateRange = {
  start: string;
  end: string | null;
};

export type JbttaSyncResult = {
  scanned: number;
  matched: number;
  imported: number;
  skippedExisting: number;
  skippedMissingDate: number;
  failed: Array<{ title: string; reason: string }>;
  importedItems: Array<{ title: string; sourceUrl: string }>;
};

function absoluteUrl(value: string) {
  try {
    return new URL(value, SOURCE_ORIGIN).toString();
  } catch {
    return '';
  }
}

function cleanText(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/[\t\r]+/g, ' ').replace(/ +/g, ' ').trim();
}

export function isTournamentGuidelineTitle(title: string) {
  const text = cleanText(title);
  if (!text) return false;
  if (!/요강/.test(text)) return false;
  if (!/(탁구|대회|오픈|리그|대축전)/.test(text)) return false;
  if (/(결과|경기결과|취소|연기|사진|영상)/.test(text)) return false;
  return true;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'ko-KR,ko;q=0.9,en;q=0.6',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error('전북협회 응답 오류 ' + response.status);
  return response.text();
}

async function fetchPageWithCookie(url: string) {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'ko-KR,ko;q=0.9,en;q=0.6',
      referer: SOURCE_BOARD,
    },
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('전북협회 상세 응답 오류 ' + response.status);
  const setCookie = response.headers.get('set-cookie') || '';
  const cookie = setCookie
    .split(',')
    .map((part) => part.trim().split(';')[0])
    .filter(Boolean)
    .join('; ');
  return { html: await response.text(), cookie };
}

async function fetchBytes(url: string, cookie = '') {
  const headers: Record<string, string> = {
      'user-agent': USER_AGENT,
      accept: '*/*',
      'accept-language': 'ko-KR,ko;q=0.9,en;q=0.6',
      referer: SOURCE_BOARD,
  };
  if (cookie) headers.cookie = cookie;
  const response = await fetch(url, {
    headers,
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) throw new Error('파일 다운로드 오류 ' + response.status);
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    bytes: buffer,
    contentType: response.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream',
    contentDisposition: response.headers.get('content-disposition') || '',
    finalUrl: response.url,
  };
}

function decodeFilenameFromDisposition(value: string) {
  const utf8 = value.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) {
    try { return decodeURIComponent(utf8.replace(/^["']|["']$/g, '')); } catch { /* ignore */ }
  }
  const normal = value.match(/filename="?([^";]+)"?/i)?.[1];
  return normal ? cleanText(normal) : '';
}

function fileNameFromUrl(url: string, fallback: string) {
  try {
    const pathname = new URL(url).pathname;
    const last = decodeURIComponent(pathname.split('/').pop() || '');
    return last && last.includes('.') ? last : fallback;
  } catch {
    return fallback;
  }
}

function safeFileName(name: string) {
  return name.replace(/[^0-9A-Za-z가-힣._-]+/g, '-').replace(/-+/g, '-').slice(-140) || 'file';
}

function normalizeYearMonthDay(year: number, month: number, day: number) {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return '';
  return String(year).padStart(4, '0') + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
}

function parseDateRange(text: string): ParsedDateRange | null {
  const normalized = text
    .replace(/\([^)]*(?:월|화|수|목|금|토|일)[^)]*\)/g, ' ')
    .replace(/[년월]/g, '.')
    .replace(/일/g, ' ')
    .replace(/～/g, '~')
    .replace(/\s+/g, ' ');

  const full = normalized.match(/(20\d{2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{1,2})(?:\s*(?:~|-)\s*(?:(\d{1,2})\s*[.\/-]\s*)?(\d{1,2}))?/);
  if (!full) return null;

  const year = Number(full[1]);
  const startMonth = Number(full[2]);
  const startDay = Number(full[3]);
  const endMonth = full[4] ? Number(full[4]) : startMonth;
  const endDay = full[5] ? Number(full[5]) : startDay;
  const start = normalizeYearMonthDay(year, startMonth, startDay);
  const end = normalizeYearMonthDay(year, endMonth, endDay);
  if (!start) return null;
  return { start, end: end && end !== start ? end : null };
}

function relevantLine(text: string, matcher: RegExp) {
  const lines = text
    .replace(/\r/g, '\n')
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean);
  return lines.find((line) => matcher.test(line)) || '';
}

function extractEventDate(text: string) {
  const primary = relevantLine(text, /(일\s*시|대회\s*일|경기\s*일|개최\s*일)/);
  return parseDateRange(primary) ?? parseDateRange(text);
}

function extractRegistrationDate(text: string) {
  const lines = text
    .replace(/\r/g, '\n')
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean);

  for (const line of lines) {
    if (!/(접수|신청|마감)/.test(line)) continue;
    const parsed = parseDateRange(line);
    if (!parsed) continue;
    if (/마감/.test(line) && !/(부터|~|-)/.test(line)) {
      return { start: null as string | null, end: parsed.start };
    }
    return { start: parsed.start as string | null, end: parsed.end ?? parsed.start };
  }
  return { start: null as string | null, end: null as string | null };
}

function extractVenue(text: string) {
  const lines = text
    .replace(/\r/g, '\n')
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean);

  const line = lines.find((value) => /(장\s*소|대회\s*장|경기\s*장)\s*[:：]/.test(value));
  if (!line) return '';
  return cleanText(line.replace(/^.*?(?:장\s*소|대회\s*장|경기\s*장)\s*[:：]\s*/, '')).slice(0, 160);
}

function statusFromDates(event: ParsedDateRange, registration: { start: string | null; end: string | null }): TournamentStatus {
  const today = new Date();
  const todayText = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const eventEnd = event.end ?? event.start;
  if (eventEnd < todayText) return '종료';
  if (registration.end && registration.end < todayText) return '마감';
  if (registration.start && registration.start > todayText) return '예정';
  if (registration.start && registration.end && registration.start <= todayText && registration.end >= todayText) return '접수중';
  if (!registration.start && registration.end && registration.end >= todayText) return '접수중';
  return '예정';
}

function extractDocumentText(bytes: Buffer, fileName: string) {
  if (!/\.hwp(x)?$/i.test(fileName)) return '';
  try {
    const doc = open(new Uint8Array(bytes));
    return documentText(doc);
  } catch {
    return '';
  }
}

async function listCandidates(pages: number) {
  const map = new Map<string, Candidate>();
  for (let page = 1; page <= pages; page += 1) {
    const html = await fetchText(SOURCE_BOARD + '&page=' + page);
    const $ = cheerio.load(html);

    $('a[href*="wr_id="]').each((_index, element) => {
      const href = $(element).attr('href') || '';
      const title = cleanText($(element).text());
      if (!title || !isTournamentGuidelineTitle(title)) return;

      const url = absoluteUrl(href);
      if (!url) return;
      const parsed = new URL(url);
      if (parsed.searchParams.get('bo_table') !== 'community_09') return;
      const wrId = parsed.searchParams.get('wr_id') || '';
      if (!wrId || map.has(wrId)) return;
      const rowText = cleanText($(element).closest('tr').text());
      const region = JEONBUK_AREAS.find((area) => rowText.includes(area));
      map.set(wrId, { wrId, title, url, region });
    });
  }
  return Array.from(map.values()).sort((a, b) => Number(b.wrId) - Number(a.wrId));
}

async function parseDetail(candidate: Candidate) {
  const page = await fetchPageWithCookie(candidate.url);
  const html = page.html;
  const cookie = page.cookie;
  const $ = cheerio.load(html);

  const contentRoot = $('#bo_v_con').length
    ? $('#bo_v_con')
    : $('.bo_v_con').length
      ? $('.bo_v_con')
      : $('article').first();

  const bodyText = cleanText(contentRoot.text() || $('body').text());

  const imageUrls: string[] = [];
  const imageSeen = new Set<string>();
  contentRoot.find('img[src]').each((_index, element) => {
    const src = absoluteUrl($(element).attr('src') || '');
    if (src && !imageSeen.has(src)) {
      imageSeen.add(src);
      imageUrls.push(src);
    }
  });

  const attachmentUrls: Array<{ url: string; label: string }> = [];
  const attachmentSeen = new Set<string>();
  $('a[href*="download.php"]').each((_index, element) => {
    const url = absoluteUrl($(element).attr('href') || '');
    if (!url || attachmentSeen.has(url)) return;
    attachmentSeen.add(url);
    attachmentUrls.push({ url, label: cleanText($(element).text()) });
  });

  const downloadedAttachments: Array<{ name: string; type: string; bytes: Buffer }> = [];
  let documentCombinedText = '';

  for (let index = 0; index < Math.min(attachmentUrls.length, 8); index += 1) {
    const attachment = attachmentUrls[index];
    const downloaded = await fetchBytes(attachment.url, cookie);
    const headerName = decodeFilenameFromDisposition(downloaded.contentDisposition);
    const labelName = attachment.label.match(/[^\s]+\.(?:hwp|hwpx|pdf|xlsx?|docx?|zip)$/i)?.[0] || '';
    const name = headerName || labelName || fileNameFromUrl(downloaded.finalUrl, '첨부파일-' + (index + 1));
    downloadedAttachments.push({ name, type: downloaded.contentType, bytes: downloaded.bytes });
    const extracted = extractDocumentText(downloaded.bytes, name);
    if (extracted) documentCombinedText += '\n' + extracted;
  }

  const combinedText = documentCombinedText.trim() || bodyText;
  return {
    combinedText,
    bodyText,
    imageUrls: imageUrls.slice(0, 8),
    attachmentUrls,
    attachments: downloadedAttachments,
  };
}


export type JbttaScanItem = {
  wrId: string;
  region: string;
  title: string;
  sourceUrl: string;
  eventStartDate: string;
  eventEndDate: string | null;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  venue: string;
  status: TournamentStatus;
  imageUrls: string[];
  attachments: Array<{ url: string; label: string }>;
};

export async function scanJbtta2026Page(page: number): Promise<{ page: number; items: JbttaScanItem[] }> {
  const html = await fetchText(SOURCE_BOARD + '&page=' + Math.max(1, page));
  const $ = cheerio.load(html);
  const map = new Map<string, Candidate>();

  $('a[href*="wr_id="]').each((_index, element) => {
    const href = $(element).attr('href') || '';
    const title = cleanText($(element).text());
    if (!title || !isTournamentGuidelineTitle(title)) return;

    const url = absoluteUrl(href);
    if (!url) return;
    const parsed = new URL(url);
    if (parsed.searchParams.get('bo_table') !== 'community_09') return;
    const wrId = parsed.searchParams.get('wr_id') || '';
    if (!wrId || map.has(wrId)) return;

    const rowText = cleanText($(element).closest('tr').text());
    const region = JEONBUK_AREAS.find((area) => rowText.includes(area));
    if (!region) return;

    map.set(wrId, { wrId, title, url, region });
  });

  const items: JbttaScanItem[] = [];
  for (const candidate of Array.from(map.values()).sort((a, b) => Number(b.wrId) - Number(a.wrId))) {
    try {
      const detail = await parseDetail(candidate);
      const event = extractEventDate(detail.combinedText);
      if (!event || !event.start.startsWith('2026-')) continue;
      const registration = extractRegistrationDate(detail.combinedText);
      const venue = extractVenue(detail.combinedText) || extractVenue(detail.bodyText) || candidate.region || '요강 참조';
      items.push({
        wrId: candidate.wrId,
        region: candidate.region || '',
        title: candidate.title,
        sourceUrl: candidate.url,
        eventStartDate: event.start,
        eventEndDate: event.end,
        registrationStartDate: registration.start,
        registrationEndDate: registration.end,
        venue,
        status: statusFromDates(event, registration),
        imageUrls: detail.imageUrls,
        attachments: detail.attachmentUrls,
      });
    } catch {
      // 개별 게시물 파싱 실패는 다음 게시물을 계속 확인한다.
    }
  }

  return { page: Math.max(1, page), items };
}

export async function syncJbttaTournaments(options?: { pages?: number; maxImports?: number }): Promise<JbttaSyncResult> {
  const pages = Math.max(1, Math.min(options?.pages ?? 1, 5));
  const maxImports = Math.max(1, Math.min(options?.maxImports ?? 6, 12));
  const supabase = createAdminServerSupabase();
  if (!supabase) throw new Error('Supabase 관리자 연결이 설정되지 않았습니다.');
  const adminSupabase = supabase;

  const candidates = await listCandidates(pages);
  const result: JbttaSyncResult = {
    scanned: candidates.length,
    matched: candidates.length,
    imported: 0,
    skippedExisting: 0,
    skippedMissingDate: 0,
    failed: [],
    importedItems: [],
  };

  const sourceUrls = candidates.map((item) => item.url);
  const { data: existingRows, error: existingError } = sourceUrls.length
    ? await adminSupabase.from('tournaments').select('source_url').in('source_url', sourceUrls)
    : { data: [], error: null };

  if (existingError) throw new Error(existingError.message);
  const existing = new Set((existingRows ?? []).map((row) => String(row.source_url || '')));

  let attempts = 0;
  for (const candidate of candidates) {
    if (existing.has(candidate.url)) {
      result.skippedExisting += 1;
      continue;
    }
    if (attempts >= maxImports) break;
    attempts += 1;

    try {
      const detail = await parseDetail(candidate);
      const event = extractEventDate(detail.combinedText);
      if (!event) {
        result.skippedMissingDate += 1;
        result.failed.push({ title: candidate.title, reason: '요강에서 대회날짜를 찾지 못했습니다.' });
        continue;
      }

      const registration = extractRegistrationDate(detail.combinedText);
      const venue = extractVenue(detail.combinedText) || extractVenue(detail.bodyText) || '요강 참조';
      const status = statusFromDates(event, registration);

      const { data: inserted, error: insertError } = await supabase
        .from('tournaments')
        .insert({
          title: candidate.title,
          event_start_date: event.start,
          event_end_date: event.end,
          registration_start_date: registration.start,
          registration_end_date: registration.end,
          venue,
          status,
          source_url: candidate.url,
          visibility: 'public',
        })
        .select('id')
        .single();

      if (insertError || !inserted?.id) throw new Error(insertError?.message ?? '대회 DB 저장 실패');
      const tournamentId = String(inserted.id);
      const uploadedPaths: string[] = [];
      const fileRows: Array<{
        tournament_id: string;
        file_name: string;
        file_type: string;
        mime_type: string | null;
        file_kind: TournamentFileKind;
        storage_path: string;
        sort_order: number;
      }> = [];

      async function uploadFile(bytes: Buffer, fileName: string, mimeType: string, kind: TournamentFileKind, order: number) {
        const storagePath = tournamentId + '/' + kind + '/' + randomUUID() + '-' + safeFileName(fileName);
        const { error } = await adminSupabase.storage.from('tournament-files').upload(storagePath, bytes, {
          contentType: mimeType || 'application/octet-stream',
          upsert: false,
        });
        if (error) throw new Error(error.message);
        uploadedPaths.push(storagePath);
        fileRows.push({
          tournament_id: tournamentId,
          file_name: fileName,
          file_type: fileName.split('.').pop()?.toLowerCase() ?? 'file',
          mime_type: mimeType || null,
          file_kind: kind,
          storage_path: storagePath,
          sort_order: order,
        });
      }

      try {
        for (let index = 0; index < detail.imageUrls.length; index += 1) {
          const url = detail.imageUrls[index];
          const file = await fetchBytes(url, '');
          const fallback = '요강-' + (index + 1) + (file.contentType.includes('png') ? '.png' : file.contentType.includes('webp') ? '.webp' : '.jpg');
          const name = fileNameFromUrl(file.finalUrl, fallback);
          await uploadFile(file.bytes, name, file.contentType, 'guideline_image', index);
        }

        for (let index = 0; index < detail.attachments.length; index += 1) {
          const file = detail.attachments[index];
          await uploadFile(file.bytes, file.name, file.type, 'attachment', 100 + index);
        }

        if (fileRows.length > 0) {
          const { error } = await adminSupabase.from('tournament_files').insert(fileRows);
          if (error) throw new Error(error.message);
        }
      } catch (fileError) {
        if (uploadedPaths.length > 0) await adminSupabase.storage.from('tournament-files').remove(uploadedPaths);
        await adminSupabase.from('tournaments').delete().eq('id', tournamentId);
        throw fileError;
      }

      existing.add(candidate.url);
      result.imported += 1;
      result.importedItems.push({ title: candidate.title, sourceUrl: candidate.url });
    } catch (error) {
      result.failed.push({
        title: candidate.title,
        reason: error instanceof Error ? error.message : '알 수 없는 자동수집 오류',
      });
    }
  }

  return result;
}
