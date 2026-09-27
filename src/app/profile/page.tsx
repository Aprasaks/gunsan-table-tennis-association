'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.css';
import SignatureModal from '../SignatureModal';
import { normalizePhone, refreshCurrentUser, saveUsers, type MvpUser } from '@/lib/mvpAuth';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);
  const [message, setMessage] = useState('');
  const [savedOpen, setSavedOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [form, setForm] = useState({
    name: '',
    gender: '' as '' | '남' | '여',
    phone: '',
    password: '',
    passwordConfirm: '',
  });

  useEffect(() => {
    refreshCurrentUser().then((currentUser) => {
      if (!currentUser) { router.replace('/login'); return; }
      setUser(currentUser);
      setSignatureDataUrl(currentUser.signatureDataUrl ?? '');
      setForm({
        name: currentUser.name, gender: currentUser.gender, phone: currentUser.phone,
        password: '', passwordConfirm: '',
      });
    });
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setMessage('');

    const phone = normalizePhone(form.phone);
    if (!form.name.trim() || !form.gender || !phone) {
      setMessage('이름, 성별, 휴대폰번호를 확인해주세요.');
      return;
    }
    if (phone.length < 10 || phone.length > 11) {
      setMessage('휴대폰번호를 확인해주세요.');
      return;
    }
    if (user.position === '회장' && !signatureDataUrl) {
      setMessage('회장 계정은 문서 승인에 사용할 서명을 등록해주세요.');
      setSignatureOpen(true);
      return;
    }
    if (form.password && form.password.length < 8) {
      setMessage('새 비밀번호는 8자 이상 입력해주세요.');
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setMessage('새 비밀번호가 서로 다릅니다.');
      return;
    }

    const response = await fetch('/api/mvp/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, gender: form.gender, phone, password: form.password, signatureDataUrl }) });
    const result = await response.json() as { user?: MvpUser; message?: string };
    if (!response.ok || !result.user) { setMessage(result.message ?? '회원정보를 저장하지 못했습니다.'); return; }
    const updated = result.user;
    saveUsers([updated]);

    setUser(updated);
    setForm((current) => ({
      ...current,
      phone,
      password: '',
      passwordConfirm: '',
    }));
    setSavedOpen(true);
  }

  if (!user) return <div className="siteShell pageContent">회원정보를 확인하고 있습니다.</div>;

  return (
    <>
      <section className="subHero">
        <div className="siteShell subHeroInner">
          <span className="crumb">HOME &gt; 정보수정</span>
          <h1>회원 정보수정</h1>
          <p>기본정보와 서명을 수정합니다. 직책과 소속은 관리자 승인으로 변경됩니다.</p>
        </div>
      </section>

      <div className="siteShell pageContent">
        <form className={styles.wrap} onSubmit={handleSubmit}>
          <h2>내 회원정보</h2>
          {message && <p className={styles.message}>{message}</p>}

          <div className={styles.row}>
            <label htmlFor="name">이름</label>
            <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className={styles.row}>
            <label htmlFor="gender">성별</label>
            <select id="gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as '남' | '여' })}>
              <option value="남">남</option>
              <option value="여">여</option>
            </select>
          </div>

          <div className={styles.row}>
            <label htmlFor="phone">휴대폰번호</label>
            <input id="phone" type="tel" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" />
          </div>

          <div className={styles.row}>
            <label>소속 클럽</label>
            <input value={user.club || '미소속'} readOnly className={styles.readOnly} />
          </div>

          <div className={styles.row}><label>구장 직책 / 협회 직책</label><input readOnly value={user.position + ' / ' + (user.associationTitle || '없음')} /></div>

          {user.position === '회장' && (
            <div className={styles.signatureBox}>
              <div>
                <strong>회장 서명</strong>
                <span>{signatureDataUrl ? '문서용 서명이 등록되어 있습니다.' : '이적동의서 등에 사용할 서명을 등록해주세요.'}</span>
              </div>
              {signatureDataUrl && <img src={signatureDataUrl} alt="등록된 회장 서명" />}
              <button type="button" onClick={() => setSignatureOpen(true)}>{signatureDataUrl ? '서명 변경' : '서명 등록'}</button>
            </div>
          )}

          <p className={styles.note}>
            소속과 직책은 관리자가 처리합니다. 구장 회장은 이적동의서에 사용할 서명을 이 화면에서 등록할 수 있습니다.
          </p>

          <div className={styles.row}>
            <label htmlFor="password">새 비밀번호 <small>(변경할 때만 입력)</small></label>
            <input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
          </div>

          <div className={styles.row}>
            <label htmlFor="password-confirm">새 비밀번호 확인</label>
            <input id="password-confirm" type="password" value={form.passwordConfirm} onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })} autoComplete="new-password" />
          </div>

          <button className={styles.action} type="submit">정보 수정하기</button>
        </form>
      </div>

      <SignatureModal open={signatureOpen} initialValue={signatureDataUrl} onClose={() => setSignatureOpen(false)} onSave={setSignatureDataUrl} />

      {savedOpen && (
        <div className={styles.confirmBackdrop} role="presentation">
          <section className={styles.confirmModal} role="dialog" aria-modal="true" aria-labelledby="profile-save-title">
            <strong id="profile-save-title">회원정보 수정</strong>
            <p>회원정보가 수정되었습니다.</p>
            <button type="button" onClick={() => setSavedOpen(false)}>확인</button>
          </section>
        </div>
      )}
    </>
  );
}
