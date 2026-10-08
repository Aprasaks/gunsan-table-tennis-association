'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="siteShell pageContent">
      <section style={{ maxWidth: 560, margin: '0 auto', background: '#fff', border: '1px solid #d8e0e6', padding: '28px 30px' }}>
        <h2 style={{ marginTop: 0 }}>페이지를 불러오지 못했습니다.</h2>
        <p>일시적인 오류가 발생했습니다. 다시 시도해보고, 계속 문제가 발생하면 홈페이지 관리자에게 알려주세요.</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button type="button" onClick={reset} style={{ height: 44, padding: '0 18px', border: 0, background: '#126da5', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>다시 시도</button>
          <a href="/" style={{ height: 44, display: 'inline-flex', alignItems: 'center', padding: '0 18px', border: '1px solid #cbd5dd' }}>홈으로</a>
        </div>
      </section>
    </div>
  );
}
