import ExcelJS from 'exceljs';

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

type OfficerInfo = {
  name: string;
  phone: string;
};

type Officers = {
  manager: OfficerInfo;
  president: OfficerInfo;
  secretary: OfficerInfo;
};

type ExportPayload = {
  clubName: string;
  clubAddress: string;
  officers?: Officers;
  members: RegistrationMember[];
};

function noteFor(member: RegistrationMember) {
  const base = member.registrationType === '이적' ? '이적(기존클럽작성)' : member.registrationType;
  return member.nationality.trim() ? `${base} / ${member.nationality.trim()}` : base;
}

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };
}

function applyRangeBorder(sheet: ExcelJS.Worksheet, fromRow: number, toRow: number, fromCol: number, toCol: number) {
  for (let row = fromRow; row <= toRow; row += 1) {
    for (let col = fromCol; col <= toCol; col += 1) {
      applyBorder(sheet.getCell(row, col));
    }
  }
}

function buildWorkbook(clubName: string, clubAddress: string, officers: Officers, members: RegistrationMember[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '군산시탁구협회';
  workbook.created = new Date();

  const memberRowCount = Math.max(31, members.length);
  const finalRow = 9 + memberRowCount;

  const sheet = workbook.addWorksheet('Sheet1', {
    pageSetup: {
      orientation: 'portrait',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  sheet.properties.defaultRowHeight = 16.5;
  sheet.views = [{ showGridLines: false }];

  sheet.getColumn('A').width = 1.5;
  sheet.getColumn('B').width = 7.375;
  sheet.getColumn('C').width = 8.43;
  sheet.getColumn('D').width = 9.375;
  sheet.getColumn('E').width = 11.25;
  sheet.getColumn('F').width = 10.5;
  sheet.getColumn('G').width = 40.5;
  sheet.getColumn('H').width = 8.43;
  sheet.getColumn('I').width = 15.5;
  sheet.getColumn('J').width = 19.875;

  sheet.getRow(2).height = 32.45;
  for (const row of [3, 4, 5, 6, 8, 10, 11, 12, 13, 14]) sheet.getRow(row).height = 17.25;
  sheet.getRow(7).height = 47.45;
  sheet.getRow(9).height = 51.75;
  for (let row = 15; row <= finalRow; row += 1) sheet.getRow(row).height = 17.25;

  sheet.mergeCells('B2:J2');
  sheet.mergeCells('B3:D3');
  sheet.mergeCells('E3:J3');
  sheet.mergeCells('B4:D4');
  sheet.mergeCells('E4:J4');
  sheet.mergeCells('C5:C6');
  sheet.mergeCells('D5:E5');
  sheet.mergeCells('D6:E6');
  sheet.mergeCells('F5:F6');
  sheet.mergeCells('H5:H6');
  sheet.mergeCells('I5:J5');
  sheet.mergeCells('I6:J6');
  sheet.mergeCells('B7:J7');
  sheet.mergeCells('B8:D8');
  sheet.mergeCells('E8:J8');

  sheet.getCell('B2').value = '전라북도탁구협회 회원등록신청서';
  sheet.getCell('B3').value = '동호회 (직장명)';
  sheet.getCell('E3').value = clubName;
  sheet.getCell('B4').value = '주 소';
  sheet.getCell('E4').value = clubAddress;
  sheet.getCell('B5').value = '성 명';
  sheet.getCell('B6').value = '연락처';
  sheet.getCell('C5').value = '관장';
  sheet.getCell('F5').value = '회장';
  sheet.getCell('H5').value = '총무';
  sheet.getCell('B7').value = '[생년월일 및 주소 기재는 동명이인 확인 위함 ]\n[부수는 전라북도 부수 기재 - 예시) 남자:남 Ace~남 7부,남 희망부 / 여자:여 Ace~여 6부,여 희망부, 외국인 국적표기 필수 ]';
  sheet.getCell('B8').value = '동호회 (직장명)';
  sheet.getCell('E8').value = clubName;

  sheet.getCell('D5').value = officers.manager.name.trim();
  sheet.getCell('D6').value = officers.manager.phone.trim();
  sheet.getCell('G5').value = officers.president.name.trim();
  sheet.getCell('G6').value = officers.president.phone.trim();
  sheet.getCell('I5').value = officers.secretary.name.trim();
  sheet.getCell('I6').value = officers.secretary.phone.trim();

  const headers = ['순', '성 명', '생년월일', '성별(남,여)', '부수', '주 소 [읍.면.동 까지기입]', '직위', '연 락 처(H.P)', '비고\n(신규,이적 표기)\n(외국인 국적표기)'];
  headers.forEach((value, index) => {
    sheet.getCell(9, index + 2).value = value;
  });

  for (let index = 0; index < memberRowCount; index += 1) {
    const row = index + 10;
    sheet.getCell(row, 2).value = index + 1;
    const member = members[index];
    if (!member) continue;

    sheet.getCell(row, 3).value = member.name.trim();
    sheet.getCell(row, 4).value = member.birthDate.trim();
    sheet.getCell(row, 5).value = member.gender;
    sheet.getCell(row, 6).value = member.rank.trim();
    sheet.getCell(row, 7).value = member.address.trim();
    sheet.getCell(row, 8).value = member.position.trim() || '회원';
    sheet.getCell(row, 9).value = member.phone.trim();
    sheet.getCell(row, 10).value = noteFor(member);
  }

  const yellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } } as ExcelJS.Fill;
  const cyan = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } } as ExcelJS.Fill;

  sheet.getCell('B2').fill = yellow;
  sheet.getCell('B7').fill = yellow;
  sheet.getCell('B2').font = { name: '맑은 고딕', size: 20, bold: false, color: { argb: 'FF000000' } };
  sheet.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.getCell('B3').font = { name: '맑은 고딕', size: 11, color: { argb: 'FF0000FF' }, underline: true };
  sheet.getCell('B7').font = { name: '맑은 고딕', size: 11, color: { argb: 'FFFF0000' } };
  sheet.getCell('B7').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  for (let row = 3; row <= 8; row += 1) {
    for (let col = 2; col <= 10; col += 1) {
      const cell = sheet.getCell(row, col);
      if (row !== 7) {
        cell.font = cell.font?.color ? cell.font : { name: '맑은 고딕', size: 11, color: { argb: 'FF000000' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }
    }
  }

  for (let col = 2; col <= 10; col += 1) {
    const cell = sheet.getCell(9, col);
    cell.font = { name: '맑은 고딕', size: 10.5, color: { argb: 'FF000000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }

  for (let row = 10; row <= finalRow; row += 1) {
    for (let col = 2; col <= 10; col += 1) {
      const cell = sheet.getCell(row, col);
      cell.font = {
        name: '맑은 고딕',
        size: 11,
        color: { argb: col === 2 ? 'FF000000' : 'FFFF0000' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
    }
  }

  members.forEach((member, index) => {
    const noteCell = sheet.getCell(index + 10, 10);
    if (member.registrationType === '신규') noteCell.fill = yellow;
    if (member.registrationType === '이적') noteCell.fill = cyan;
  });

  applyRangeBorder(sheet, 2, finalRow, 2, 10);
  sheet.pageSetup.printArea = `B2:J${finalRow}`;

  return workbook;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as ExportPayload;
    const clubName = payload.clubName?.trim();
    const clubAddress = payload.clubAddress?.trim() ?? '';
    const officers: Officers = payload.officers ?? {
      manager: { name: '', phone: '' },
      president: { name: '', phone: '' },
      secretary: { name: '', phone: '' },
    };
    const members = (payload.members ?? []).filter((member) => member?.name?.trim());

    if (!clubName || members.length === 0) {
      return Response.json({ message: '동호회명과 등록 회원을 입력해주세요.' }, { status: 400 });
    }

    const workbook = buildWorkbook(clubName, clubAddress, officers, members);
    const output = await workbook.xlsx.writeBuffer();
    const bytes = Uint8Array.from(output as unknown as Uint8Array);
    const responseBody = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
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
