import { NextResponse } from 'next/server';
import { actor, db, sameOrigin } from '@/lib/mvpServer';
import { isAssociationOfficer } from '@/lib/mvpAuth';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  try {
    const current = await actor();
    if (!current) return NextResponse.json({ message: '로그인이 필요합니다.' }, { status: 401 });
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const action = body?.action;
    const { data: transfer, error } = await db().from('mvp_transfers').select('*').eq('id', id).single();
    if (error || !transfer) return NextResponse.json({ message: '신청을 찾을 수 없습니다.' }, { status: 404 });
    if (['source_sign', 'destination_confirm', 'destination_reject'].includes(action)) {
      if (current.admin || !current.user || current.user.position !== '회장') {
        return NextResponse.json({ message: '동호회 회장만 처리할 수 있습니다.' }, { status: 403 });
      }
      const { data: result, error: stageError } = await db().rpc('advance_mvp_transfer', {
        p_id: id, p_action: action, p_actor: current.user.id,
      });
      if (stageError) throw stageError;
      if (result !== 'ok') {
        const messages: Record<string, string> = {
          forbidden: '해당 동호회 회장만 처리할 수 있습니다.',
          signature_missing: '정보수정 화면에서 회장 서명을 먼저 등록하고 저장해주세요.',
          not_ready: 'A동호회 회장의 서명 동의가 완료되지 않았습니다.',
          already_processed: '이미 처리한 신청입니다.',
          missing: '이적 신청을 찾을 수 없습니다.',
        };
        return NextResponse.json({ message: messages[result] ?? '현재 신청 상태를 확인해주세요.' }, { status: result === 'forbidden' ? 403 : 409 });
      }
      return NextResponse.json({ ok: true });
    }
    if (!['approve', 'reject'].includes(action) || !current.user || !isAssociationOfficer(current.user)) {
      return NextResponse.json({ message: '협회장·사무국장·총무만 승인할 수 있습니다.' }, { status: 403 });
    }
    if (transfer.status === 'pending_source_chair') {
      return NextResponse.json({ message: '기존 동호회 회장의 서명 확인이 완료되지 않았습니다.' }, { status: 409 });
    }
    if (action === 'approve' && (!transfer.draft_member_id || !transfer.birth_date)) {
      return NextResponse.json({ message: '이전 형식의 신청은 선수명부 자동 이전을 지원하지 않습니다.' }, { status: 409 });
    }
    const by = current.user.id;
    const { data: outcome, error: rpcError } = await db().rpc('process_mvp_transfer', {
      p_id: id, p_action: action, p_actor: by, p_note: String(body?.note ?? '').slice(0, 1000),
    });
    if (rpcError) throw rpcError;
    if (outcome !== 'ok') {
      const messages: Record<string, string> = {
        already_processed: '이미 처리된 신청입니다.',
        missing_consents: '기존 회장 서명과 새 소속 회장 확인이 필요합니다.',
        source_missing: '기존 동호회 선수명부가 없습니다.',
        player_missing: '기존 명부에 이적 선수가 없습니다.',
        player_changed: '이적 신청 후 선수 정보가 변경되었습니다.',
        duplicate_player: '새 동호회 명부에 이미 동일한 선수가 있습니다.',
        destination_full: '새 동호회 명부가 200명 한도에 도달했습니다.',
        destination_changed: '새 동호회 회장 직책이 변경되었습니다.',
        legacy_not_supported: '이전 형식의 신청은 자동 이적을 지원하지 않습니다.',
      };
      return NextResponse.json({ message: messages[outcome] ?? '선수명부를 확인해주세요: ' + outcome }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: '승인을 처리하지 못했습니다.' }, { status: 503 });
  }
}
