'use client';

import { useEffect, useRef } from 'react';
import type { TransferRequest } from '@/lib/mvpTransfer';
import styles from './documentPreview.module.css';

export type TransferDocumentKind = 'consent' | 'application';

type Props = {
  request: TransferRequest;
  kind: TransferDocumentKind;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
};

const columns = ['성명', '성별', '부수', '기존동호회(클럽)', '이적동호회(클럽)', '연락처'];

function rankText(rank: string) {
  return rank.replace(/^(남|여)\s*/, '').replace(/부$/, '') || '-';
}
function phoneText(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  if (digits.length === 10) return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  return phone;
}
function dateText(date: string) {
  const [year, month, day] = date.split('-');
  return (year || '') + '년   ' + Number(month || 0) + '월   ' + Number(day || 0) + '일';
}

function PlayerTable({ request, blanks }: { request: TransferRequest; blanks: number }) {
  const row = [request.memberName, request.gender, rankText(request.rank), request.fromClub, request.toClub, phoneText(request.phone)];
  return <div className={styles.tableScroll}>
    <table className={styles.table}>
      <thead><tr>{columns.map((name) => <th key={name}>{name}</th>)}</tr></thead>
      <tbody>
        <tr>{row.map((value, index) => <td key={columns[index]}>{value}</td>)}</tr>
        {Array.from({ length: blanks }, (_, index) =>
          <tr key={index} aria-hidden="true">{columns.map((name) => <td key={name}>&nbsp;</td>)}</tr>)}
      </tbody>
    </table>
  </div>;
}

function Consent({ request }: { request: TransferRequest }) {
  return <>
    <h3 className={styles.documentTitle}>동호회(클럽) 이적동의서</h3>
    <PlayerTable request={request} blanks={8} />
    <p className={styles.declaration}>상기와 같이 동호회 이적(소속변경)을 동의 합니다.</p>
    <p className={styles.date}>{dateText(request.requestDate)}</p>
    <div className={styles.signSection}>
      <span>클럽 회장&nbsp; {request.sourceChairName}&nbsp; (인)</span>
      {request.sourceChairSignatureDataUrl ?
        <img src={request.sourceChairSignatureDataUrl} className={styles.signature} alt="기존 동호회 회장 서명" /> :
        <span className={styles.missing}>서명 없음</span>}
    </div>
    <p className={styles.recipient}>군 산 시 탁 구 협 회 귀중</p>
  </>;
}

const caution = [
  '1. 본 탁구협회는 무분별한 이적을 지양합니다.',
  '2. 단순 대회 참가목적으로 이적하는 행위는 절대 삼가 해주십시오.',
];
const rules = [
  '1. 회원이 소속을 이적하고자 할 때는 「이적, 소속변경신청서」를 제출해야 한다.',
  '2. 이적,소속변경 후 대회 출전자격 및 기간은 다음과 같다.',
  ' - 도내 협회 (주최. 주관)대회에 단체전 3개월간 출전할 수 없으며, 개인전 출전 가능함.',
  '3. 동호회 이적(소속변경)은 년 1회로 한정한다.',
  '4. 단, 동호회의 파산이나 분산.[직장&이사] 이동 등.. 인하여 발생된 2,3항 위반의 경우, 생활체육운영위원에서 심의하여 구제할 수 있다.',
  '5. 동호회 등록을 2년 이상 하지 않았을 경우 이적 신청서 없이 등록이 가능하다. 단, 기 가입된 동호회가 등록된 경우에는 반드시 이적 신청서가 첨부되어야 한다.',
];

function Application({ request }: { request: TransferRequest }) {
  return <>
    <h3 className={styles.documentTitle}>동호회(클럽) 이적, 소속변경 신청서</h3>
    <PlayerTable request={request} blanks={4} />
    <div className={styles.rules}>
      <p className={styles.rulesTitle}>[주의사항]</p>
      {caution.map((line) => <p key={line}>{line}</p>)}
      <p className={styles.rulesTitle}>[회원관리규정-제6조 3항]</p>
      {rules.map((line) => <p key={line}>{line}</p>)}
    </div>
    <p className={styles.declaration}>상기와 같이 동호회 이적(소속변경)을 신청 합니다.</p>
    <p className={styles.date}>{dateText(request.requestDate)}</p>
    <div className={styles.approvalLine}>사무국장 <span>(인)&nbsp; 서명</span></div>
    <div className={styles.approvalLine}>(시,군)탁구협회장 <span>(인)&nbsp; 직인</span></div>
    <p className={styles.recipient}>전 라 북 도 탁 구 협 회 귀중</p>
  </>;
}

export default function TransferDocumentPreview({ request, kind, onClose, onDownload, downloading }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      previousFocus?.focus();
    };
  }, []);

  const title = kind === 'consent' ? '이적동의서' : '이적·소속변경 신청서';
  return <div className={styles.backdrop} onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className={styles.dialog} role="dialog" aria-modal="true"
      aria-labelledby="transfer-preview-title" aria-describedby="transfer-preview-note">
      <header className={styles.header}>
        <div>
          <h2 id="transfer-preview-title">{title} 미리보기</h2>
          <p>{request.memberName} · {request.fromClub} → {request.toClub}</p>
        </div>
        <button type="button" ref={closeRef} className={styles.close} onClick={onClose} aria-label="미리보기 닫기">×</button>
      </header>
      <div className={styles.scroller}>
        <p className={styles.note} id="transfer-preview-note">
          이적 신청 데이터로 구성한 화면 미리보기입니다. 실제 HWP 파일과 글꼴·줄바꿈·페이지 배치는 다를 수 있습니다.
        </p>
        <div className={styles.paper}>
          {kind === 'consent' ? <Consent request={request} /> : <Application request={request} />}
        </div>
      </div>
      <footer className={styles.footer}>
        <button type="button" className={styles.dismiss} onClick={onClose}>닫기</button>
        <button type="button" className={styles.download} onClick={onDownload} disabled={downloading}>
          {downloading ? '다운로드 중…' : 'HWP 다운로드'}
        </button>
      </footer>
    </section>
  </div>;
}
