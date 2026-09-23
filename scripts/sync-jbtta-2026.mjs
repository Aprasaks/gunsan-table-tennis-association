import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { documentText, open } from 'js-hwp';
import * as cheerio from 'cheerio';

const ORIGIN = 'http://jbtta.pingpongkorea.com';
const BOARD = ORIGIN + '/bbs/board.php?bo_table=community_09';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36';
const OUTPUT = 'src/data/jbtta-2026.json';
const JEONBUK = ['전주','군산','익산','정읍','남원','김제','완주','진안','무주','장수','임실','순창','고창','부안','전북','전라북도','전북특별자치도'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const execFileAsync = promisify(execFile);
const clean = (s='') => s.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();

function absolute(href='') {
  try { return new URL(href, ORIGIN).toString(); } catch { return ''; }
}

async function fetchResponse(url, accept='text/html,*/*') {
  const response = await fetch(url, {
    headers: { 'user-agent': UA, accept, 'accept-language': 'ko-KR,ko;q=0.9,en;q=0.5', referer: BOARD },
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

function titleCandidate(title='', wrId='0') {
  const t=clean(title);
  if (!t || !/요강/.test(t) || !/(탁구|대회|오픈|리그|대축전)/.test(t)) return false;
  if (/(결과|취소|연기|사진|영상|수정사항|변경사항)/.test(t)) return false;
  if (/20(?:1\d|2[0-5])/.test(t)) return false;
  return /2026/.test(t) || Number(wrId)>=1650;
}

function cleanTitle(title='') {
  return clean(title).replace(/\s*댓글\+?\d+개\s*/g,' ').replace(/\s+/g,' ').trim();
}

async function ocrImage(url, index) {
  try {
    const res=await fetchResponse(url,'image/*,*/*');
    const bytes=Buffer.from(await res.arrayBuffer());
    const contentType=res.headers.get('content-type')||'';
    const ext=contentType.includes('png')?'.png':contentType.includes('webp')?'.webp':'.jpg';
    const file=path.join(os.tmpdir(),'jbtta-'+Date.now()+'-'+index+ext);
    await fs.writeFile(file,bytes);
    const { stdout }=await execFileAsync('tesseract',[file,'stdout','-l','kor+eng','--psm','6'],{maxBuffer:8*1024*1024});
    await fs.unlink(file).catch(()=>{});
    return stdout||'';
  } catch(e) {
    console.log('OCR failed',url,String(e).slice(0,160));
    return '';
  }
}

async function collectCandidates() {
  const map=new Map();
  for (let page=1; page<=8; page++) {
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
  const html=await (await fetchResponse(c.url)).text();
  const $=cheerio.load(html);
  const root=$('#bo_v_con').length?$('#bo_v_con'):$('.bo_v_con').length?$('.bo_v_con'):$('body');
  const bodyText=root.text().replace(/\r/g,'\n');

  const images=[];
  const seenImg=new Set();
  root.find('img').each((_i,el)=>{
    const url=absolute($(el).attr('src')||'');
    if (!url || seenImg.has(url)) return;
    if (!/\/data\/editor\/|view_image\.php/i.test(url)) return;
    seenImg.add(url);
    images.push(url);
  });

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
  for (let i=0;i<Math.min(links.length,10);i++) {
    const link=links[i];
    try {
      const res=await fetchResponse(link.url,'*/*');
      const bytes=new Uint8Array(await res.arrayBuffer());
      const disposition=res.headers.get('content-disposition')||'';
      let name=decodeFilename(disposition) || link.label.match(/[^\s]+\.(?:hwp|hwpx|pdf|xlsx?|docx?|zip)/i)?.[0] || '첨부파일-'+(i+1);
      name=clean(name);
      files.push({
        id:'jbtta-'+c.wrId+'-file-'+i,
        fileName:name,
        fileType:extFromName(name),
        mimeType:res.headers.get('content-type')?.split(';')[0]||null,
        fileKind:'attachment',
        storagePath:'',
        publicUrl:link.url,
        sortOrder:100+i,
      });
      if (/\.hwp(x)?$/i.test(name)) {
        try {
          const doc=open(bytes);
          const txt=documentText(doc);
          if (txt) hwpText+='\n'+txt;
        } catch (e) {
          console.log('HWP parse failed',c.wrId,name,String(e).slice(0,150));
        }
      }
    } catch(e) {
      console.log('attachment failed',c.wrId,link.url,String(e).slice(0,150));
    }
    await sleep(200);
  }

  let ocrText='';
  for (let i=0;i<Math.min(images.length,8);i++) {
    const text=await ocrImage(images[i],i);
    if (text) ocrText+='\n'+text;
  }
  const combined=[hwpText,bodyText,ocrText].filter(Boolean).join('\n');
  const event=extractEventDate(hwpText+'\n'+ocrText,c.title) || extractEventDate(bodyText,c.title);
  const reg=extractRegistration(hwpText+'\n'+ocrText) || extractRegistration(bodyText);
  const venue=extractVenue(hwpText+'\n'+ocrText) || extractVenue(bodyText);

  return {
    event,reg,venue,combined,
    files:[
      ...images.map((url,i)=>({
        id:'jbtta-'+c.wrId+'-img-'+i,
        fileName:'요강 이미지 '+(i+1),
        fileType:'image',
        mimeType:'image/*',
        fileKind:'guideline_image',
        storagePath:'',
        publicUrl:url,
        sortOrder:i,
      })),
      ...files,
    ]
  };
}

const candidates=await collectCandidates();
console.log('total candidate posts:',candidates.length);
const output=[];

for (const c of candidates) {
  try {
    const d=await parseDetail(c);
    if (!d.event || !d.event.start.startsWith('2026-')) {
      console.log('skip year/date',c.wrId,c.title,d.event);
      continue;
    }
    if (!isJeonbuk(c.title,d.venue,d.combined)) {
      console.log('skip outside Jeonbuk',c.wrId,c.title,'venue=',d.venue);
      continue;
    }
    const item={
      id:'jbtta-'+c.wrId,
      title:cleanTitle(c.title.replace(/\s*요강(?:\s*\([^)]*\))?\s*$/,'').trim()),
      eventStartDate:d.event.start,
      eventEndDate:d.event.end,
      registrationStartDate:d.reg.start,
      registrationEndDate:d.reg.end,
      venue:d.venue||'요강 참조',
      status:status(d.event,d.reg),
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
await fs.writeFile(OUTPUT,JSON.stringify(output,null,2)+'\n','utf8');
console.log('WROTE',OUTPUT,output.length,'events');
