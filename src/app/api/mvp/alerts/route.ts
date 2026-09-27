import { NextResponse } from 'next/server';
import { actor, db, sameOrigin } from '@/lib/mvpServer';

async function recipient() {
  const current = await actor();
  if (!current || (!current.admin && !current.user.associationTitle)) return null;
  return current.admin ? 'admin-root' : current.user.id;
}
export async function GET() {
  try {
    const key = await recipient();
    if (!key) return NextResponse.json({ message: '협회 임원 권한이 필요합니다.' }, { status: 403 });
    const client = db();
    const [{ data: alerts, error }, { data: reads, error: readError }] = await Promise.all([
      client.from('mvp_alerts').select('*').order('created_at', { ascending: false }).limit(100),
      client.from('mvp_alert_reads').select('alert_id').eq('recipient_key', key),
    ]);
    if (error || readError) throw error ?? readError;
    const readIds = new Set((reads ?? []).map((row) => row.alert_id));
    return NextResponse.json({ alerts: (alerts ?? []).map((row) => ({
      id: row.id, kind: row.kind, title: row.title, detail: row.detail, targetUrl: row.target_url,
      createdAt: row.created_at, read: readIds.has(row.id),
    })) });
  } catch { return NextResponse.json({ message: '알림을 불러오지 못했습니다.' }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ message: '잘못된 요청입니다.' }, { status: 403 });
  try {
    const key = await recipient();
    if (!key) return NextResponse.json({ message: '협회 임원 권한이 필요합니다.' }, { status: 403 });
    const body = await request.json().catch(() => null);
    if (!/^[0-9a-f-]{36}$/.test(String(body?.id ?? ''))) return NextResponse.json({ message: '알림을 확인해주세요.' }, { status: 400 });
    const { data } = await db().from('mvp_alerts').select('id').eq('id', body.id).maybeSingle();
    if (!data) return NextResponse.json({ message: '알림이 없습니다.' }, { status: 404 });
    const { error } = await db().from('mvp_alert_reads').upsert({ alert_id: body.id, recipient_key: key }, { onConflict: 'alert_id,recipient_key' });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ message: '알림을 읽음 처리하지 못했습니다.' }, { status: 503 }); }
}
