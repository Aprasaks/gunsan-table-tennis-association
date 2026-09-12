import ExcelJS from 'exceljs';
import { MEMBER_REGISTRATION_TEMPLATE_BASE64 } from '@/lib/memberRegistrationTemplate';

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

export async function POST(request: Request) {
  try {
    const payload = await request.json() as ExportPayload;
    const clubName = payload.clubName?.trim();
    const clubAddress = payload.clubAddress?.trim();
    const members = (payload.members ?? []).filter((member) => member.name.trim());

    if (!clubName || members.length === 0) {
      return Response.json({ message: '동호회명과 등록 회원을 입력해주세요.' }, { status: 400 });
    }
    if (members.length > 31) {
      return Response.json({ message: '현재 원본 양식은 최대 31명까지 등록할 수 있습니다.' }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    const templateBuffer = Buffer.from(MEMBER_REGISTRATION_TEMPLATE_BASE64, 'base64');
    await workbook.xlsx.load(templateBuffer);
    const sheet = workbook.getWorksheet(1);
    if (!sheet) {
      return Response.json({ message: '회원등록 엑셀 템플릿을 읽지 못했습니다.' }, { status: 500 });
    }

    sheet.getCell('E3').value = clubName;
    sheet.getCell('E4').value = clubAddress;
    sheet.getCell('E8').value = clubName;

    const manager = topOfficer(members, '관장');
    const president = topOfficer(members, '회장');
    const secretary = topOfficer(members, '총무');

    sheet.getCell('D5').value = manager?.name ?? '';
    sheet.getCell('D6').value = manager?.phone ?? '';
    sheet.getCell('G5').value = president?.name ?? '';
    sheet.getCell('G6').value = president?.phone ?? '';
    sheet.getCell('I5').value = secretary?.name ?? '';
    sheet.getCell('I6').value = secretary?.phone ?? '';

    for (let row = 10; row <= 40; row += 1) {
      sheet.getCell(`C${row}`).value = '';
      sheet.getCell(`D${row}`).value = '';
      sheet.getCell(`E${row}`).value = '';
      sheet.getCell(`F${row}`).value = '';
      sheet.getCell(`G${row}`).value = '';
      sheet.getCell(`H${row}`).value = '';
      sheet.getCell(`I${row}`).value = '';
      sheet.getCell(`J${row}`).value = '';
    }

    members.forEach((member, index) => {
      const row = index + 10;
      sheet.getCell(`C${row}`).value = member.name.trim();
      sheet.getCell(`D${row}`).value = member.birthDate.trim();
      sheet.getCell(`E${row}`).value = member.gender;
      sheet.getCell(`F${row}`).value = member.rank.trim();
      sheet.getCell(`G${row}`).value = member.address.trim();
      sheet.getCell(`H${row}`).value = member.position.trim() || '회원';
      sheet.getCell(`I${row}`).value = member.phone.trim();
      sheet.getCell(`J${row}`).value = noteFor(member);
    });

    const output = await workbook.xlsx.writeBuffer();
    const safeClubName = clubName.replace(/[\\/:*?"<>|]/g, '_');
    const filename = `${safeClubName}_2026_회원등록신청서.xlsx`;

    return new Response(Buffer.from(output), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('member registration export failed', error);
    return Response.json({ message: '엑셀 파일 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
