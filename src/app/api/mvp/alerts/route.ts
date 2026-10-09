import { NextResponse } from 'next/server';
import { isAssociationOfficer, isPersonalClub } from '@/lib/mvpAuth';
import { actor, db, logServerError, sameOrigin } from '@/lib/mvpServer';

async function recipient() {
  const current = await actor();
  if (!current) return null;
  const officer = current.admin || isAssociationOfficer(current.user);
  const chair = !current.admin && current.user.position === '회장' && !isPersonalClub(current.user.club);
  if (!officer && !chair) return null;
  return { key: current.admin ? 'admin-root' : current.user.id, officer, chair };
}

function visibleAlerts(key: string, officer: boolean, chair: boolean) {
  let query = db().from('mvp_alerts').select('*');
  if (officer && chair) query = query.or(`recipient_key.is.null,recipient_key.eq.${key}`);
  else if (officer) query = query.is('recipient_key', null);
  else query = query.eq('recipient_key', key);
  return query;
}

export async function GET() {
  try {
    const viewer = await recipient();
    if (!viewer) return NextResponse.json({ message: '알림 조회 권한이 없습니다.' }, { status: 403 });
    const [{ data: alerts, error }, { data: reads, error: readError }] = await Promise.all([
      visibleAlerts(viewer.key, viewer.officer, viewer.chair)
        .order('created_at', { ascending: false }).limit(100),
      db().from('mvp_alert_reads').select('alert_id').eq('recipient_key', viewer.key),
    ]);
    if (error || readError) throw error ?? readError;
    const readIds = new Set((reads ?? []).map((row) => row.alert_id));
    return NextResponse.json({ alerts: (alerts ?? []).map((row) => ({
      id: row.id, kind: row.kind, title: row.title, detail: row.detail, targetUrl: row.target_url,
      createdAt: row.created_at, read: readIds.has(row.id),
    })) });
  } catch (cause) {
    logServerError('[api/mvp/alerts] failed to list alerts', cause);
    return NextResponse.json({ message: '알림을 불러오지 못했습니다.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  try {
    const viewer = await recipient();
    if (!viewer) return NextResponse.json({ message: '알림 조회 권한이 없습니다.' }, { status: 403 });
    const body = await request.json().catch(() => null);
    if (!/^[0-9a-f-]{36}$/.test(String(body?.id ?? ''))) {
      return NextResponse.json({ message: '알림을 확인해주세요.' }, { status: 400 });
    }
    const { data, error: accessError } = await visibleAlerts(viewer.key, viewer.officer, viewer.chair)
      .eq('id', body.id).maybeSingle();
    if (accessError) throw accessError;
    if (!data) return NextResponse.json({ message: '알림이 없습니다.' }, { status: 404 });
    const { error } = await db().from('mvp_alert_reads')
      .upsert({ alert_id: body.id, recipient_key: viewer.key }, { onConflict: 'alert_id,recipient_key' });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (cause) {
    logServerError('[api/mvp/alerts] failed to mark alert read', cause);
    return NextResponse.json({ message: '알림을 읽음 처리하지 못했습니다.' }, { status: 503 });
  }
}
