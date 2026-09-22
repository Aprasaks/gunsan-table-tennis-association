import { NextRequest, NextResponse } from 'next/server';
import { DocumentBuilder, save } from 'js-hwp';

type TransferPayload = {
  id: string;
  memberName: string;
  gender: '남' | '여';
  rank: string;
  phone: string;
  fromClub: string;
  toClub: string;
  sourceChairName: string;
  sourceChairSignatureDataUrl: string;
  requestDate: string;
};

type HwpRequest = { kind: 'consent' | 'application'; request: TransferPayload };

function rankText(rank: string) { return rank.replace(/^(남|여)\s*/, '').replace(/부$/, '') || '-'; }

function phoneText(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  if (digits.length === 10) return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  return phone;
}

function dateParts(value: string) {
  const parts = value.split('-');
  return { year: parts[0] || '', month: String(Number(parts[1] || '0')), day: String(Number(parts[2] || '0')) };
}

function signatureBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1];
  return base64 ? new Uint8Array(Buffer.from(base64, 'base64')) : null;
}

function memberTable(request: TransferPayload, blankRows: number) {
  const header = ['성명', '성별', '부수', '기존동호회(클럽)', '이적동호회(클럽)', '연락처'];
  const member = [request.memberName, request.gender, rankText(request.rank), request.fromClub, request.toClub, phoneText(request.phone)];
  return [header, member, ...Array.from({ length: blankRows }, () => ['', '', '', '', '', ''])];
}

function buildConsent(request: TransferPayload) {
  const date = dateParts(request.requestDate);
  const builder = new DocumentBuilder().meta({ title: request.memberName + ' 이적동의서', author: '군산시탁구협회' }).page({ paper: 'A4', margins: { left: '25mm', right: '25mm', top: '24mm', bottom: '24mm' } }).defaultTextStyle({ size: 10 });

  builder.paragraph((p) => p.bold('동호회(클럽) 이적동의서', { size: 18 }), { align: 'center', spaceAfter: '7mm' });
  builder.table(memberTable(request, 8), { header: true, width: '160mm', columnWidths: ['18mm', '14mm', '14mm', '36mm', '36mm', '42mm'], rowHeight: '8mm' });
  builder.paragraph('상기와 같이 동호회 이적(소속변경)을 동의 합니다.', { align: 'center', spaceBefore: '10mm', spaceAfter: '6mm' });
  builder.paragraph(date.year + '년   ' + date.month + '월   ' + date.day + '일', { align: 'center', spaceAfter: '7mm' });
  builder.paragraph('클럽 회장   ' + request.sourceChairName + '   (인)', { align: 'right', spaceAfter: '2mm' });

  const signature = signatureBytes(request.sourceChairSignatureDataUrl);
  if (signature) {
    builder.defaultParagraphStyle({ align: 'right' });
    builder.image(signature, { format: 'png', width: '34mm', height: '13mm', alt: '기존 소속 클럽 회장 서명' });
    builder.defaultParagraphStyle({ align: 'left' });
  }

  builder.paragraph('군 산 시 탁 구 협 회 귀중', { align: 'center', spaceBefore: '12mm' });
  return save(builder.build(), 'hwp');
}

function buildApplication(request: TransferPayload) {
  const date = dateParts(request.requestDate);
  const builder = new DocumentBuilder().meta({ title: request.memberName + ' 이적 소속변경 신청서', author: '군산시탁구협회' }).page({ paper: 'A4', margins: { left: '25mm', right: '25mm', top: '20mm', bottom: '20mm' } }).defaultTextStyle({ size: 9.5 });

  builder.paragraph((p) => p.bold('동호회(클럽) 이적, 소속변경 신청서', { size: 17 }), { align: 'center', spaceAfter: '6mm' });
  builder.table(memberTable(request, 4), { header: true, width: '160mm', columnWidths: ['18mm', '14mm', '14mm', '36mm', '36mm', '42mm'], rowHeight: '7mm' });

  builder.paragraph('[주의사항]', { spaceBefore: '7mm' });
  builder.paragraph('1. 본 탁구협회는 무분별한 이적을 지양합니다.');
  builder.paragraph('2. 단순 대회 참가목적으로 이적하는 행위는 절대 삼가 해주십시오.', { spaceAfter: '4mm' });
  builder.paragraph('[회원관리규정-제6조 3항]');
  builder.paragraph('1. 회원이 소속을 이적하고자 할 때는 「이적, 소속변경신청서」를 제출해야 한다.');
  builder.paragraph('2. 이적,소속변경 후 대회 출전자격 및 기간은 다음과 같다.');
  builder.paragraph(' - 도내 협회 (주최. 주관)대회에 단체전 3개월간 출전할 수 없으며, 개인전 출전 가능함.');
  builder.paragraph('3. 동호회 이적(소속변경)은 년 1회로 한정한다.');
  builder.paragraph('4. 단, 동호회의 파산이나 분산.[직장&이사] 이동 등.. 인하여 발생된 2,3항 위반의 경우, 생활체육운영위원에서 심의하여 구제할 수 있다.');
  builder.paragraph('5. 동호회 등록을 2년 이상 하지 않았을 경우 이적 신청서 없이 등록이 가능하다. 단, 기 가입된 동호회가 등록된 경우에는 반드시 이적 신청서가 첨부되어야 한다.', { spaceAfter: '6mm' });
  builder.paragraph('상기와 같이 동호회 이적(소속변경)을 신청 합니다.', { align: 'center', spaceAfter: '5mm' });
  builder.paragraph(date.year + '년   ' + date.month + '월   ' + date.day + '일', { align: 'center', spaceAfter: '6mm' });
  builder.paragraph('사무국장                         (인)    서명', { align: 'right', spaceAfter: '4mm' });
  builder.paragraph('(시,군)탁구협회장                (인)    직인', { align: 'right', spaceAfter: '9mm' });
  builder.paragraph('전 라 북 도 탁 구 협 회 귀중', { align: 'center' });
  return save(builder.build(), 'hwp');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as HwpRequest;
    if (!body?.request || (body.kind !== 'consent' && body.kind !== 'application')) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });

    const bytes = body.kind === 'consent' ? buildConsent(body.request) : buildApplication(body.request);
    const filename = body.kind === 'consent' ? body.request.memberName + '_이적동의서.hwp' : body.request.memberName + '_이적_소속변경신청서.hwp';

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/x-hwp',
        'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(filename),
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: '한글파일 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
