import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { documentText, open } from 'js-hwp';
import * as cheerio from 'cheerio';

const ORIGIN = 'http://jbtta.pingpongkorea.com';
const BOARD = ORIGIN + '/bbs/board.php?bo_table=community_09';
const NEWTT_ORIGIN = 'https://www.newttplay.co.kr';
const NEWTT_BOARD = NEWTT_ORIGIN + '/bbs/board.php?bo_table=gamecup';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36';
const OUTPUT = 'src/data/jbtta-2026.json';
const PUBLIC_JBTTA_DIR = path.join('public', 'jbtta', '2026');
const STAGING_JBTTA_DIR = path.join('public', 'jbtta', '2026-next');
const JEONBUK = ['전주','군산','익산','정읍','남원','김제','완주','진안','무주','장수','임실','순창','고창','부안','전북','전라북도','전북특별자치도'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const execFileAsync = promisify(execFile);
const clean = (s='') => s.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
let outputDir = PUBLIC_JBTTA_DIR;

function absolute(href='') {
  try { return new URL(href, ORIGIN).toString(); } catch { return ''; }
}

function cookieFromResponse(response) {
  const setCookie = response.headers.get('set-cookie') || '';
  return setCookie
    .split(',')
    .map((part) => part.trim().split(';')[0])
    .filter(Boolean)
    .join('; ');
}

async function fetchResponse(url, accept='text/html,*/*', cookie='') {
  const headers = {
    'user-agent': UA,
    accept,
    'accept-language': 'ko-KR,ko;q=0.9,en;q=0.5',
    referer: BOARD,
  };
  if (cookie) headers.cookie = cookie;
  const response = await fetch(url, {
    headers,
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(url + ' -> HTTP ' + response.status);
  return response;
}

function decodeFilename(disposition='') {
  const utf = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf) { try { return decodeURIComponent(utf.replace(/^["']|["']$/g,'')); } catch {} }
  return disposition.match(/filename="?([^";]+)"?/i)?.[1] || '';
}

function parseYmd(y,m,d) {
  const yy=Number(y), mm=Number(m), dd=Number(d);
  if (yy<2000||yy>2100||mm<1||mm>12||dd<1||dd>31) return '';
  return String(yy).padStart(4,'0')+'-'+String(mm).padStart(2,'0')+'-'+String(dd).padStart(2,'0');
}

function parseDateRange(text='', defaultYear=2026) {
  const t=text.replace(/[년월]/g,'.').replace(/일/g,' ').replace(/～/g,'~').replace(/[–—]/g,'-').replace(/\([^)]*\)/g,' ');
  let m=t.match(/(20\d{2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{1,2})(?:\s*(?:~|-)\s*(?:(\d{1,2})\s*[.\/-]\s*)?(\d{1,2}))?/);
  if (m) {
    const start=parseYmd(m[1],m[2],m[3]);
    const end=parseYmd(m[1],m[4]||m[2],m[5]||m[3]);
    if (!start) return null;
    return { start, end: end && end!==start ? end : null };
  }
  m=t.match(/(?:^|\s)(\d{1,2})\s*[.\/-]\s*(\d{1,2})(?:\s*(?:~|-)\s*(?:(\d{1,2})\s*[.\/-]\s*)?(\d{1,2}))?/);
  if (!m) return null;
  const start=parseYmd(defaultYear,m[1],m[2]);
  const end=parseYmd(defaultYear,m[3]||m[1],m[4]||m[2]);
  if (!start) return null;
  return { start, end: end && end!==start ? end : null };
}

function lines(text='') {
  return text.replace(/\r/g,'\n').split(/\n+/).map(clean).filter(Boolean);
}

function extractEventDate(text='', title='') {
  const titleDate=parseDateRange(title,2026);
  if (titleDate && /(?:대회일|경기일|개최일|\d{1,2}[.\/-]\d{1,2}\s*[~-]\s*\d{1,2})/.test(title)) return titleDate;
  for (const line of lines(text)) {
    if (/(일\s*시|일\s*자|대회\s*일|경기\s*일|개최\s*일|행사\s*일)/.test(line)) {
      const d=parseDateRange(line,2026); if (d) return d;
    }
  }
  return null;
}

function extractRegistration(text='') {
  for (const line of lines(text)) {
    if (!/(접수\s*(기간|일정|일자)|신청\s*(기간|일정|일자)|접수마감|신청마감)/.test(line)) continue;
    const d=parseDateRange(line,2026);
    if (!d) continue;
    if (/마감/.test(line) && !/[~-]/.test(line)) return { start:null, end:d.start };
    return { start:d.start, end:d.end || d.start };
  }
  return { start:null, end:null };
}

function extractVenue(text='') {
  for (const line of lines(text)) {
    if (!/(장\s*소|대회장|경기장)\s*[:：]/.test(line)) continue;
    const v=clean(line.replace(/^.*?(?:장\s*소|대회장|경기장)\s*[:：]\s*/,''));
    if (v) return v.slice(0,180);
  }
  for (const line of lines(text)) {
    if (JEONBUK.some((name)=>line.includes(name)) && /(체육관|경기장|탁구장|실내체육관|문화체육센터|국민체육센터)/.test(line)) return line.slice(0,180);
  }
  return '';
}

function status(event, reg) {
  const now=new Date();
  const today=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  const end=event.end||event.start;
  if (end<today) return '종료';
  if (reg.end && reg.end<today) return '마감';
  if (reg.start && reg.start>today) return '예정';
  if (reg.end && reg.end>=today) return '접수중';
  return '예정';
}

function isJeonbuk(title, venue, text) {
  const probe=[title,venue, ...lines(text).slice(0,80)].join(' ');
  return JEONBUK.some((name)=>probe.includes(name));
}

function extFromName(name='') {
  return name.includes('.') ? name.split('.').pop().toLowerCase() : 'file';
}

function safeFileName(name='file') {
  const safe = clean(name)
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\.+$/g, '')
    .slice(0, 120);
  return safe || 'file';
}

function extFromContentType(contentType='') {
  if (contentType.includes('pdf')) return 'pdf';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('hwp')) return 'hwp';
  if (contentType.includes('wordprocessingml')) return 'docx';
  if (contentType.includes('spreadsheetml')) return 'xlsx';
  return '';
}

function ensureExtension(name, contentType='') {
  if (/\.[A-Za-z0-9]{2,8}$/.test(name)) return name;
  const ext = extFromContentType(contentType);
  return ext ? name + '.' + ext : name;
}

function publicFileUrl(wrId, fileName) {
  return '/jbtta/2026/' + encodeURIComponent(String(wrId)) + '/' + encodeURIComponent(fileName);
}

async function writeTournamentFile(wrId, fileName, bytes) {
  const dir = path.join(outputDir, String(wrId));
  await fs.mkdir(dir, { recursive: true });
  const safeName = safeFileName(fileName);
  await fs.writeFile(path.join(dir, safeName), bytes);
  return {
    fileName: safeName,
    storagePath: path.join(PUBLIC_JBTTA_DIR, String(wrId), safeName),
    publicUrl: publicFileUrl(wrId, safeName),
  };
}

function isImageFile(name='', contentType='') {
  return contentType.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name);
}

async function createPdfPreview(pdfPath, wrId, previewName, id, sortOrder) {
  const dir = path.join(outputDir, String(wrId));
  const base = safeFileName(previewName.replace(/\.[^.]+$/, '')) || 'preview';
  const outPrefix = path.join(dir, base);
  const outName = base + '.png';
  try {
    await execFileAsync('pdftoppm', ['-png', '-f', '1', '-singlefile', '-r', '160', pdfPath, outPrefix], { maxBuffer: 8 * 1024 * 1024 });
    return {
      id,
      fileName: outName,
      fileType: 'image',
      mimeType: 'image/png',
      fileKind: 'guideline_image',
      storagePath: path.join(PUBLIC_JBTTA_DIR, String(wrId), outName),
      publicUrl: publicFileUrl(wrId, outName),
      sortOrder,
    };
  } catch (e) {
    console.log('PDF preview failed', wrId, path.basename(pdfPath), String(e).slice(0, 160));
    return null;
  }
}

async function createOfficePreview(sourcePath, wrId, previewName, id, sortOrder) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jbtta-preview-'));
  try {
    await execFileAsync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', tmpDir, sourcePath], { maxBuffer: 8 * 1024 * 1024 });
    const converted = (await fs.readdir(tmpDir)).find((name) => /\.pdf$/i.test(name));
    if (!converted) return null;
    return await createPdfPreview(path.join(tmpDir, converted), wrId, previewName, id, sortOrder);
  } catch (e) {
    console.log('document preview failed', wrId, path.basename(sourcePath), String(e).slice(0, 160));
    return null;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function titleCandidate(title='', wrId='0') {
  const t=clean(title);
  if (!t || !/(탁구대회|탁구 대회|대회\s*요강|탁구.*요강|오픈.*탁구|탁구.*오픈)/.test(t)) return false;
  if (/(결과|경기결과|취소|연기|사진|영상|시간표|대진표|추가\s*접수|추가\s*공지|수정사항|변경사항|마감\s*안내)/.test(t)) return false;
  if (/20(?:1\d|2[0-5])/.test(t)) return false;
  return /2026/.test(t) || /제\d+회/.test(t) || Number(wrId)>=1650;
}

function cleanTitle(title='') {
  return clean(title).replace(/\s*댓글\+?\d+개\s*/g,' ').replace(/\s+/g,' ').trim();
}

function matchKey(value='') {
  return clean(value)
    .replace(/댓글\+?\d+개/g,'')
    .replace(/2026년?/g,'')
    .replace(/전국|오픈|동호인|탁구|대회|요강|전북특별자치도|전라북도/g,'')
    .replace(/[^가-힣A-Za-z0-9]/g,'')
    .toLowerCase();
}

function bigrams(value='') {
  const s=matchKey(value);
  const set=new Set();
  if (s.length<2) { if (s) set.add(s); return set; }
  for (let i=0;i<s.length-1;i++) set.add(s.slice(i,i+2));
  return set;
}

function titleScore(a,b) {
  const aa=bigrams(a), bb=bigrams(b);
  if (!aa.size || !bb.size) return 0;
  let intersect=0;
  for (const x of aa) if (bb.has(x)) intersect++;
  return (2*intersect)/(aa.size+bb.size);
}

async function collectNewttIndex() {
  const rows=[];
  const seen=new Set();
  for (let page=1;page<=8;page++) {
    try {
      const html=await (await fetchResponse(NEWTT_BOARD+'&page='+page)).text();
      const $=cheerio.load(html);
      $('a[href*="bo_table=gamecup"][href*="wr_id="]').each((_i,el)=>{
        const href=$(el).attr('href')||'';
        const title=clean($(el).text());
        if (!title || !/(탁구|대회)/.test(title)) return;
        const url=new URL(href,NEWTT_ORIGIN).toString();
        const u=new URL(url);
        const wrId=u.searchParams.get('wr_id');
        if (!wrId || seen.has(wrId)) return;
        seen.add(wrId);
        rows.push({title,url});
      });
    } catch(e) {
      console.log('newtt index page failed',page,String(e).slice(0,160));
    }
  }
  console.log('newtt indexed events:',rows.length);
  return rows;
}

async function enrichFromNewtt(candidate,indexRows) {
  let best=null;
  let bestScore=0;
  for (const row of indexRows) {
    let score=titleScore(candidate.title,row.title);
    const aliases=['진포배','의암주논개배','정읍시장배','임실N치즈배','새만금배','전라감영배','백제왕도','고창모양성배','반딧불이배','완주군수배','남원시장기'];
    if (aliases.some((alias)=>candidate.title.includes(alias)&&row.title.includes(alias))) score=Math.max(score,0.95);
    if (score>bestScore) { best=row; bestScore=score; }
  }
  if (!best || bestScore<0.50) return null;
  try {
    const html=await (await fetchResponse(best.url)).text();
    const $=cheerio.load(html);
    const text=$('body').text().replace(/\r/g,'\n').replace(/[ \t]+/g,' ');
    const eventMatch=text.match(/대회일자\s*[:：]?\s*(20\d{2})[-./](\d{1,2})[-./](\d{1,2})\s*~\s*(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
    if (!eventMatch) return null;
    const event={
      start:parseYmd(eventMatch[1],eventMatch[2],eventMatch[3]),
      end:parseYmd(eventMatch[4],eventMatch[5],eventMatch[6])
    };
    if (!event.start || !event.start.startsWith('2026-')) return null;

    let reg={start:null,end:null};
    const regMatch=text.match(/접수\s*일시\s*[:：]?\s*(20\d{2})[-./](\d{1,2})[-./](\d{1,2})[\s\S]{0,80}?~\s*(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
    if (regMatch) {
      reg={
        start:parseYmd(regMatch[1],regMatch[2],regMatch[3]),
        end:parseYmd(regMatch[4],regMatch[5],regMatch[6])
      };
    } else {
      const closeMatch=text.match(/접수마감(?:일시)?\s*[:：]?\s*(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
      if (closeMatch) reg.end=parseYmd(closeMatch[1],closeMatch[2],closeMatch[3]);
    }

    let venue='';
    const venueMatch=text.match(/위치\s*[:：]?\s*전북\s+([\s\S]{1,120}?)(?:주소|대회일자|접수)/);
    if (venueMatch) venue=clean(venueMatch[1].replace(/\[Input\]/g,'')).slice(0,160);
    if (!venue) {
      const placeMatch=text.match(/장\s*소\s*[:：]\s*([^\n]{2,120})/);
      if (placeMatch) venue=clean(placeMatch[1]).slice(0,160);
    }

    console.log('NEWTT MATCH',candidate.wrId,'score',bestScore.toFixed(2),best.title,event.start,event.end,venue);
    return {event:{start:event.start,end:event.end===event.start?null:event.end},reg,venue};
  } catch(e) {
    console.log('newtt detail failed',candidate.wrId,String(e).slice(0,160));
    return null;
  }
}

async function collectCandidates() {
  const map=new Map();
  for (let page=1; page<=3; page++) {
    const html=await (await fetchResponse(BOARD+'&page='+page)).text();
    const $=cheerio.load(html);
    let found=0;
    $('a[href*="wr_id="]').each((_i,el)=>{
      const href=$(el).attr('href')||'';
      const title=clean($(el).text());
      const url=absolute(href); if (!url) return;
      const u=new URL(url);
      if (u.searchParams.get('bo_table')!=='community_09') return;
      const wrId=u.searchParams.get('wr_id'); if (!wrId) return;
      if (!titleCandidate(title,wrId)) return;
      map.set(wrId,{wrId,title:cleanTitle(title),url}); found++;
    });
    console.log('page',page,'candidate links',found);
    await sleep(200);
  }
  return [...map.values()].sort((a,b)=>Number(b.wrId)-Number(a.wrId));
}


async function parseDetail(c) {
  const pageResponse = await fetchResponse(c.url);
  const cookie = cookieFromResponse(pageResponse);
  const html=await pageResponse.text();
  const $=cheerio.load(html);
  const root=$('#bo_v_con').length?$('#bo_v_con'):$('.bo_v_con').length?$('.bo_v_con'):$('body');
  const bodyText=root.text().replace(/\r/g,'\n');

  const links=[];
  const seenLink=new Set();
  $('a[href*="download.php"]').each((_i,el)=>{
    const url=absolute($(el).attr('href')||'');
    if (!url || seenLink.has(url)) return;
    seenLink.add(url);
    links.push({url,label:clean($(el).text())});
  });

  let hwpText='';
  const files=[];
  const previews=[];
  for (let i=0;i<Math.min(links.length,10);i++) {
    const link=links[i];
    try {
      const res=await fetchResponse(link.url,'*/*',cookie);
      const bytes=Buffer.from(await res.arrayBuffer());
      const disposition=res.headers.get('content-disposition')||'';
      const contentType=res.headers.get('content-type')?.split(';')[0]||'application/octet-stream';
      let name=decodeFilename(disposition) || link.label.match(/[^\s]+\.(?:hwp|hwpx|pdf|xlsx?|docx?|zip|png|jpe?g)/i)?.[0] || '첨부파일-'+(i+1);
      name=ensureExtension(clean(name), contentType);
      const local=await writeTournamentFile(c.wrId, 'attachment-'+String(i+1).padStart(2,'0')+'-'+name, bytes);
      files.push({
        id:'jbtta-'+c.wrId+'-file-'+i,
        fileName:name,
        fileType:extFromName(name),
        mimeType:contentType,
        fileKind:'attachment',
        storagePath:local.storagePath,
        publicUrl:local.publicUrl,
        sortOrder:100+i,
      });
      if (/\.hwp(x)?$/i.test(name)) {
        try {
          const doc=open(new Uint8Array(bytes));
          const txt=documentText(doc);
          if (txt) hwpText+='\n'+txt;
        } catch (e) {
          console.log('HWP parse failed',c.wrId,name,String(e).slice(0,150));
        }
      }

      if (isImageFile(name, contentType)) {
        previews.push({
          id:'jbtta-'+c.wrId+'-preview-'+i,
          fileName:local.fileName,
          fileType:'image',
          mimeType:contentType,
          fileKind:'guideline_image',
          storagePath:local.storagePath,
          publicUrl:local.publicUrl,
          sortOrder:i,
        });
      } else if (/\.pdf$/i.test(name)) {
        const preview=await createPdfPreview(local.storagePath, c.wrId, 'preview-'+String(i+1).padStart(2,'0')+'.png', 'jbtta-'+c.wrId+'-preview-'+i, i);
        if (preview) previews.push(preview);
      } else if (/\.(hwp|hwpx|docx?|xlsx?)$/i.test(name)) {
        const preview=await createOfficePreview(local.storagePath, c.wrId, 'preview-'+String(i+1).padStart(2,'0')+'.png', 'jbtta-'+c.wrId+'-preview-'+i, i);
        if (preview) previews.push(preview);
      }
    } catch(e) {
      console.log('attachment failed',c.wrId,link.url,String(e).slice(0,150));
    }
    await sleep(200);
  }

  const combined=[hwpText,bodyText].filter(Boolean).join('\n');
  const event=extractEventDate(hwpText,c.title) || extractEventDate(bodyText,c.title);
  const reg=extractRegistration(hwpText) || extractRegistration(bodyText);
  const venue=extractVenue(hwpText) || extractVenue(bodyText);

  return {
    event,reg,venue,combined,
    files:[
      ...previews,
      ...files,
    ]
  };
}

await fs.rm(STAGING_JBTTA_DIR,{recursive:true,force:true});
await fs.mkdir(STAGING_JBTTA_DIR,{recursive:true});
outputDir = STAGING_JBTTA_DIR;
const candidates=await collectCandidates();
console.log('total candidate posts:',candidates.length);
const newttIndex=await collectNewttIndex();
const output=[];

for (const c of candidates) {
  try {
    const newtt=await enrichFromNewtt(c,newttIndex);
    const d=await parseDetail(c);
    if (!/2026/.test(c.title) && !newtt) {
      console.log('skip unverified year',c.wrId,c.title);
      continue;
    }
    const event=newtt?.event || d.event;
    const reg=newtt?.reg || d.reg;
    const venue=newtt?.venue || d.venue;
    if (!event || !event.start.startsWith('2026-')) {
      console.log('skip year/date',c.wrId,c.title,event);
      continue;
    }
    if (!isJeonbuk(c.title,venue,d.combined)) {
      console.log('skip outside Jeonbuk',c.wrId,c.title,'venue=',d.venue);
      continue;
    }
    const item={
      id:'jbtta-'+c.wrId,
      title:cleanTitle(c.title.replace(/\s*요강(?:\s*\([^)]*\))?\s*$/,'').trim()),
      eventStartDate:event.start,
      eventEndDate:event.end,
      registrationStartDate:reg.start,
      registrationEndDate:reg.end,
      venue:venue||'요강 참조',
      status:status(event,reg),
      sourceUrl:c.url,
      visibility:'public',
      createdAt:'2026-01-01T00:00:00.000Z',
      updatedAt:new Date().toISOString(),
      files:d.files,
    };
    output.push(item);
    console.log('INCLUDE',item.eventStartDate,item.title,item.venue);
  } catch(e) {
    console.log('detail failed',c.wrId,c.title,String(e).slice(0,250));
  }
  await sleep(300);
}

output.sort((a,b)=>a.eventStartDate.localeCompare(b.eventStartDate)||a.title.localeCompare(b.title));
await fs.mkdir('src/data',{recursive:true});
await fs.writeFile(OUTPUT+'.tmp',JSON.stringify(output,null,2)+'\n','utf8');
await fs.rm(PUBLIC_JBTTA_DIR,{recursive:true,force:true});
await fs.rename(STAGING_JBTTA_DIR,PUBLIC_JBTTA_DIR);
await fs.rename(OUTPUT+'.tmp',OUTPUT);
console.log('WROTE',OUTPUT,output.length,'events');
