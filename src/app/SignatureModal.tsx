'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './signature.module.css';

type SignatureModalProps = {
  open: boolean;
  initialValue?: string;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
};

export default function SignatureModal({ open, initialValue, onClose, onSave }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(Boolean(initialValue));

  useEffect(() => {
    if (!open) return;
    setHasInk(Boolean(initialValue));

    const frame = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));

      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);
      context.lineWidth = 2.4;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = '#17212a';

      if (initialValue) {
        const image = new Image();
        image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
        image.src = initialValue;
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [open, initialValue]);

  if (!open) return null;

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const p = point(event);
    context.beginPath();
    context.moveTo(p.x, p.y);
    setHasInk(true);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    const p = point(event);
    context.lineTo(p.x, p.y);
    context.stroke();
  }

  function end(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    drawingRef.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);
    setHasInk(false);
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk) return;
    onSave(canvas.toDataURL('image/png'));
    onClose();
  }

  return (
    <div className={styles.backdrop} role="presentation">
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="signature-title">
        <div className={styles.header}>
          <div>
            <h2 id="signature-title">회장 서명 등록</h2>
            <p>마우스, 터치펜 또는 휴대폰 화면에서 손가락으로 서명하세요.</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">×</button>
        </div>

        <div className={styles.paper}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onPointerLeave={(event) => {
              if (drawingRef.current) end(event);
            }}
          />
          <span>위 영역에 서명</span>
        </div>

        <p className={styles.notice}>등록한 서명은 이적동의서 등 회장 확인이 필요한 문서에 사용할 수 있습니다.</p>

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={clear}>다시 쓰기</button>
          <button type="button" className={styles.primary} onClick={save} disabled={!hasInk}>서명 저장</button>
        </div>
      </section>
    </div>
  );
}
