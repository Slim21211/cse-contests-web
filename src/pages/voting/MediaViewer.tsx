import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../components/icon/Icon';
import ZoomImage from './ZoomImage';
import LikeButton from './LikeButton';
import type { Work } from './types';
import s from './voting.module.scss';

interface Props {
  work: Work;
  liked: boolean;
  canVote: boolean;
  onLike: (on: boolean) => void;
  onClose: () => void;
}

/** Просмотр фото или видео на весь экран: крестик, Esc, свайп вниз; внизу — подпись и лайк. */
const MediaViewer = ({ work, liked, canVote, onLike, onClose }: Props) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [drag, setDrag] = useState(0);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div
      className={s.viewer}
      role="dialog"
      aria-modal="true"
      aria-label={`${work.title} — просмотр`}
      style={{ backgroundColor: `rgba(15, 12, 10, ${1 - drag * 0.6})` }}
    >
      <div className={s.viewerStage}>
        {work.kind === 'video' ? (
          <video
            className={s.viewerVideo}
            src={work.url}
            poster={work.posterUrl ?? undefined}
            controls
            autoPlay
            playsInline
          />
        ) : (
          <ZoomImage
            src={work.url}
            alt={work.title}
            rotation={work.rotation}
            onSwipeClose={onClose}
            onDrag={setDrag}
          />
        )}
      </div>

      <button
        ref={closeRef}
        type="button"
        className={s.viewerClose}
        onClick={onClose}
        aria-label="Закрыть"
      >
        <Icon name="close" size={22} />
      </button>

      <div className={s.viewerBar} style={{ opacity: 1 - drag }}>
        <div className={s.viewerCaption}>
          <span className={s.viewerTitle}>{work.title}</span>
          {work.subtitle && <span className={s.viewerSub}>{work.subtitle}</span>}
        </div>
        {canVote && <LikeButton liked={liked} onToggle={() => onLike(!liked)} variant="dark" />}
      </div>
    </div>,
    document.body,
  );
};

export default MediaViewer;
