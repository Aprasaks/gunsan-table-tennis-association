'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.css';
import SignatureModal from '../SignatureModal';
import { getCurrentUser, getUsers, hashPassword, normalizePhone, updateUserBasicInfo, type MvpUser } from '@/lib/mvpAuth';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<MvpUser | null>(null);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [form, setForm] = useState({ name: '', gender: '' as '' | '남' | '여', phone: '', password: '', passwordConfirm: '' });

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) { router.replace('/login'); return; }
    setUser(currentUser);
    setSignatureDataUrl(currentUser.signatureDataUrl ?? '');
    setForm({ name: currentUser.name, gender: currentUser.gender, phone: currentUser.phone, password: '', passwordConfirm: '' });
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setMessage('');
    setSuccess('');

    const phone = normalizePhone(form.phone);
    if (!form.name.trim() || !form.gender || !phone) { setMessage('이름, 성별, 휴대폰번호를 확인해주세요.'); return; }
    if (phone.length < 10 || phone.length > 11) { setMessage('휴대폰번호를 확인해주세요.'); return; }
    if (getUsers().some((item) => item.id !== user.id && item.phone === phone)) { setMessage('이미 다른 회원이 사용 중인 휴대폰번호입니다.'); return; }
    if (user.position === '회장' && !signatureDataUrl) { setMessage('회장 계정은 문서 승인에 사용할 서명을 등록해주세요.'); setSignatureOpen(true); return; }
    if (form.password && form.password.length < 4) { setMessage('새 비밀번호는 4자 이상 입력해주세요.'); return; }
    if (form.password !== form.passwordConfirm) { setMessage('새 비밀번호가 서로 다릅니다.'); return; }

    const changes: Parameters<typeof updateUserBasicInfo>[1] = { name: form.name.trim(), gender: form.gender, phone, signatureDataUrl: user.position === '회장' ? signatureDataUrl : user.signatureDataUrl };
    if (form.password) changes.passwordHash = await hashPassword(form.password);

    const updated = updateUserBasicInfo(user.id, changes);
    if (!updated) { setMessage('회원정보를 저장하지 못했습니다.'); return; }

    setUser(updated);
    setForm((current) => ({ ...current, phone, password: '', passwordConfirm: '' }));
    setSuccess('회원정보가 수정되었습니다.');
  }

  if (!user) return <div className="siteShell pageContent">회원정보를 확인하고 있습니다.</div>;

  return (
    <>
      <section className="subHero"><div className="siteShell subHeroInner"><span className="crumb">HOME &gt; 정보수정</span><h1>회원 정보수정</h1><p>연락처 등 기본정보를 수정합니다. 소속 클럽은 이적·신규·탈퇴 처리 결과에 따라 자동 변경됩니다.</p></div></section>

      <div className="siteShell pageContent">
        <form className={styles.wrap} onSubmit={handleSubmit}>
          <h2>내 회원정보</h2>
          {message && <p className={styles.message}>{message}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <div className={styles.row}><label htmlFor="name">이름</label><input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className={styles.row}><label htmlFor="gender">성별</label><select id="gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as '남' | '여' })}><option value="남">남</option><option value="여">여</option></select></div>
          <div className={styles.row}><label htmlFor="phone">휴대폰번호</label><input id="phone" type="tel" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010-0000-0000" /></div>
          <div className={styles.row}><label>소속 클럽</label><input value={user.club || '미소속'} readOnly className={styles.readOnly} /></div>
          <div className={styles.row}><label>직책</label><input value={user.position || '회원'} readOnly className={styles.readOnly} /></div>

          {user.position === '회장' && (
            <div className={styles.signatureBox}>
              <div><strong>회장 서명</strong><span>{signatureDataUrl ? '문서용 서명이 등록되어 있습니다.' : '이적동의서 등에 사용할 서명을 등록해주세요.'}</span></div>
              {signatureDataUrl && <img src={signatureDataUrl} alt="등록된 회장 서명" />}
              <button type="button" onClick={() => setSignatureOpen(true)}>{signatureDataUrl ? '서명 변경' : '서명 등록'}</button>
            </div>
          )}

          <p className={styles.note}>소속 클럽과 직책은 회원이 직접 바꾸지 않습니다. 이적 승인, 신규 등록, 탈퇴 처리가 완료되면 계정 정보에도 자동으로 반영되도록 연결합니다.</p>

          <div className={styles.row}><label htmlFor="password">새 비밀번호 <small>(변경할 때만 입력)</small></label><input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /></div>
          <div className={styles.row}><label htmlFor="password-confirm">새 비밀번호 확인</label><input id="password-confirm" type="password" value={form.passwordConfirm} onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })} autoComplete="new-password" /></div>
          <button className={styles.action} type="submit">정보 수정하기</button>
        </form>
      </div>

      <SignatureModal open={signatureOpen} initialValue={signatureDataUrl} onClose={() => setSignatureOpen(false)} onSave={setSignatureDataUrl} />
    </>
  );
}
