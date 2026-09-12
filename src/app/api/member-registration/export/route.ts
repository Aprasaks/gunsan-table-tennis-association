import JSZip from 'jszip';
import { MEMBER_REGISTRATION_TEMPLATE_BASE64 } from '@/lib/memberRegistrationTemplate';

export const runtime = 'nodejs';

type RegistrationMember = {
  name: string;
  birthDate: string;
  gender: '남' | '여' | '';
  rank: string;
  address: string;
  position: string;
  phone: string;
  registrationType: '기존' | '신규' | '이적';
  nationality: string;
};

type ExportPayload = {
  clubName: string;
  clubAddress: string;
  members: RegistrationMember[];
};

function topOfficer(members: RegistrationMember[], position: string) {
  return members.find((member) => member.position === position);
}

function noteFor(member: RegistrationMember) {
  const base = member.registrationType === '이적' ? '이적(기존클럽작성)' : member.registrationType;
  return member.nationality.trim() ? `${base} / ${member.nationality.trim()}` : base;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanCellAttributes(attributes: string) {
  return attributes.replace(/\s+t="[^"]*"/g, '');
}

function setCellText(xml: string, cellRef: string, value: string) {
  const selfClosing = new RegExp(`<c([^>]*\\br="${cellRef}"[^>]*)\\s*\\/>`);
  const paired = new RegExp(`<c([^>]*\\br="${cellRef}"[^>]*)>[\\s\\S]*?<\\/c>`);
  const text = value.trim();

  const render = (attributes: string) => {
    const cleaned = cleanCellAttributes(attributes);
    if (!text) return `<c${cleaned}/>`;
    return `<c${cleaned} t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
  };

  const selfMatch = xml.match(selfClosing);
  if (selfMatch) return xml.replace(selfClosing, render(selfMatch[1]));

  const pairedMatch = xml.match(paired);
  if (pairedMatch) return xml.replace(paired, render(pairedMatch[1]));

  throw new Error(`원본 양식에서 ${cellRef} 셀을 찾지 못했습니다.`);
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as ExportPayload;
    const clubName = payload.clubName?.trim();
    const clubAddress = payload.clubAddress?.trim() ?? '';
    const members = (payload.members ?? []).filter((member) => member?.name?.trim());

    if (!clubName || members.length === 0) {
      return Response.json({ message: '동호회명과 등록 회원을 입력해주세요.' }, { status: 400 });
    }
    if (members.length > 31) {
      return Response.json({ message: '현재 원본 양식은 최대 31명까지 등록할 수 있습니다.' }, { status: 400 });
    }

    const templateBytes = Buffer.from(MEMBER_REGISTRATION_TEMPLATE_BASE64, 'base64');
    const zip = await JSZip.loadAsync(templateBytes);
    const sheetFile = zip.file('xl/worksheets/sheet1.xml');
    if (!sheetFile) {
      throw new Error('원본 양식의 Sheet1을 읽지 못했습니다.');
    }

    let sheetXml = await sheetFile.async('string');

    sheetXml = setCellText(sheetXml, 'E3', clubName);
    sheetXml = setCellText(sheetXml, 'E4', clubAddress);
    sheetXml = setCellText(sheetXml, 'E8', clubName);

    const manager = topOfficer(members, '관장');
    const president = topOfficer(members, '회장');
    const secretary = topOfficer(members, '총무');

    sheetXml = setCellText(sheetXml, 'D5', manager?.name ?? '');
    sheetXml = setCellText(sheetXml, 'D6', manager?.phone ?? '');
    sheetXml = setCellText(sheetXml, 'G5', president?.name ?? '');
    sheetXml = setCellText(sheetXml, 'G6', president?.phone ?? '');
    sheetXml = setCellText(sheetXml, 'I5', secretary?.name ?? '');
    sheetXml = setCellText(sheetXml, 'I6', secretary?.phone ?? '');

    for (let row = 10; row <= 40; row += 1) {
      for (const column of ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']) {
        sheetXml = setCellText(sheetXml, `${column}${row}`, '');
      }
    }

    members.forEach((member, index) => {
      const row = index + 10;
      sheetXml = setCellText(sheetXml, `C${row}`, member.name.trim());
      sheetXml = setCellText(sheetXml, `D${row}`, member.birthDate.trim());
      sheetXml = setCellText(sheetXml, `E${row}`, member.gender);
      sheetXml = setCellText(sheetXml, `F${row}`, member.rank.trim());
      sheetXml = setCellText(sheetXml, `G${row}`, member.address.trim());
      sheetXml = setCellText(sheetXml, `H${row}`, member.position.trim() || '회원');
      sheetXml = setCellText(sheetXml, `I${row}`, member.phone.trim());
      sheetXml = setCellText(sheetXml, `J${row}`, noteFor(member));
    });

    zip.file('xl/worksheets/sheet1.xml', sheetXml);
    const output = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const responseBody = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer;
    const safeClubName = clubName.replace(/[\\/:*?"<>|]/g, '_');
    const filename = `${safeClubName}_2026_회원등록신청서.xlsx`;

    return new Response(responseBody, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('member registration export failed', error);
    const detail = error instanceof Error ? error.message : '알 수 없는 오류';
    return Response.json({ message: `엑셀 파일 생성 중 오류가 발생했습니다. ${detail}` }, { status: 500 });
  }
}
