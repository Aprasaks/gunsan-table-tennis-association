import { NextResponse } from 'next/server';
import { actor, db, sameOrigin } from '@/lib/mvpServer';

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
    if (action === 'destination') {
      if (current.admin || current.user.position !== '회장' || current.user.club !== transfer.to_club) {
        return NextResponse.json({ message: '도착 소속 회장만 승인할 수 있습니다.' }, { status: 403 });
      }
    } else if (!['approve', 'reject'].includes(action) || !(current.admin || current.user.associationTitle)) {
      return NextResponse.json({ message: '협회 승인 권한이 없습니다.' }, { status: 403 });
    }
    const by = current.admin ? 'admin' : current.user.id;
    const { data: outcome, error: rpcError } = await db().rpc('process_mvp_transfer', {
      p_id: id, p_action: action, p_actor: by, p_note: String(body?.note ?? '').slice(0, 1000),
    });
    if (rpcError) throw rpcError;
    if (outcome !== 'ok') return NextResponse.json({
      message: outcome === 'already_processed' ? '이미 처리 완료된 승인입니다.' : '신청 상태를 확인해주세요.',
    }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: '승인을 처리하지 못했습니다.' }, { status: 503 });
  }
}
