'use client';

import { type MouseEvent, useEffect, useState } from 'react';
import styles from './RichContentViewer.module.css';

type ViewerImage = {
  src: string;
  alt: string;
};

type RichContentViewerProps = {
  html: string;
  className: string;
};

export default function RichContentViewer({ html, className }: RichContentViewerProps) {
  const [images, setImages] = useState<ViewerImage[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const hasImages = /<img(?:\s|>)/i.test(html);
  const activeImage = activeIndex === null ? null : images[activeIndex];

  useEffect(() => {
    if (activeIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setActiveIndex(null);
      if (event.key === 'ArrowRight' && images.length > 1) {
        setActiveIndex((current) => current === null ? null : (current + 1) % images.length);
      }
      if (event.key === 'ArrowLeft' && images.length > 1) {
        setActiveIndex((current) => current === null ? null : (current - 1 + images.length) % images.length);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeIndex, images.length]);

  function openImage(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;

    event.preventDefault();
    const imageElements = Array.from(event.currentTarget.querySelectorAll('img'));
    const selectedIndex = imageElements.indexOf(target);
    if (selectedIndex < 0) return;

    setImages(imageElements.map((image, index) => ({
      src: image.currentSrc || image.src,
      alt: image.alt || `본문 이미지 ${index + 1}`,
    })));
    setActiveIndex(selectedIndex);
  }

  function showPrevious() {
    setActiveIndex((current) => current === null ? null : (current - 1 + images.length) % images.length);
  }

  function showNext() {
    setActiveIndex((current) => current === null ? null : (current + 1) % images.length);
  }

  return <>
    {hasImages && <p className={styles.hint}><span aria-hidden="true">⌕</span> 이미지를 누르면 크게 볼 수 있습니다.</p>}
    <div
      className={`${className} ${styles.content}`}
      onClick={openImage}
      dangerouslySetInnerHTML={{ __html: html }}
    />

    {activeImage && activeIndex !== null && (
      <div
        className={styles.overlay}
        role="dialog"
        aria-modal="true"
        aria-label="이미지 크게 보기"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setActiveIndex(null);
        }}
      >
        <button type="button" className={styles.closeButton} onClick={() => setActiveIndex(null)} aria-label="닫기">×</button>
        {images.length > 1 && <button type="button" className={`${styles.arrowButton} ${styles.previousButton}`} onClick={showPrevious} aria-label="이전 이미지">‹</button>}
        <div className={styles.imageStage}>
          {/* eslint-disable-next-line @next/next/no-img-element -- private user uploads have no build-time dimensions */}
          <img src={activeImage.src} alt={activeImage.alt} className={styles.fullImage} />
        </div>
        {images.length > 1 && <button type="button" className={`${styles.arrowButton} ${styles.nextButton}`} onClick={showNext} aria-label="다음 이미지">›</button>}
        <div className={styles.counter}>{activeIndex + 1} / {images.length}</div>
      </div>
    )}
  </>;
}
