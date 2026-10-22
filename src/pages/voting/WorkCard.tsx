import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/icon/Icon';
import AudioPlayer from './AudioPlayer';
import LikeButton from './LikeButton';
import { extBadge, fileLabel } from './workKind';
import type { Work } from './types';
import s from './voting.module.scss';

interface Props {
  work: Work;
  liked: boolean;
  canVote: boolean;
  onLike: (on: boolean) => void;
  onOpen: () => void;
}

const DOUBLE_TAP_MS = 280;

/** Плашка для файлов, которые браузер не показывает: PDF, документы, архивы, HEIC. */
const FileTile = ({ url, label }: { url: string; label: string }) => {
  const isPdf = label === 'Документ PDF';
  return (
    <div className={s.fileTile}>
      <span className={s.fileBadge}>{extBadge(url)}</span>
      <span className={s.fileText}>
        <span className={s.fileName}>{label}</span>
        <span className={s.fileHint}>
          {isPdf ? 'Откроется в новой вкладке' : 'Браузер не показывает такой файл'}
        </span>
      </span>
      <a className={s.fileButton} href={url} target="_blank" rel="noreferrer">
        {isPdf ? 'Открыть' : 'Скачать'}
      </a>
    </div>
  );
};

/** Карточка работы в ленте: медиа, подпись, лайк. Двойной тап по фото — лайк. */
const WorkCard = ({ work, liked, canVote, onLike, onOpen }: Props) => {
  const [broken, setBroken] = useState(false);
  const [burst, setBurst] = useState(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearTimeout(tapTimer.current ?? undefined), []);

  // Одиночный тап открывает просмотр (с небольшой задержкой), двойной — ставит лайк.
  const onPhotoClick = () => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      if (canVote) {
        if (!liked) onLike(true);
        setBurst((n) => n + 1);
      }
      return;
    }
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      onOpen();
    }, DOUBLE_TAP_MS);
  };

  const sideways = work.rotation % 180 !== 0;

  let media;
  if (work.kind === 'image' && !broken) {
    media = (
      <button
        type="button"
        className={s.media}
        onClick={onPhotoClick}
        aria-label={`Открыть: ${work.title}`}
      >
        <img
          src={work.url}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className={sideways ? s.mediaImgSideways : s.mediaImg}
          style={
            work.rotation
              ? {
                  transform: sideways
                    ? `translate(-50%, -50%) rotate(${work.rotation}deg)`
                    : `rotate(${work.rotation}deg)`,
                }
              : undefined
          }
          onError={() => setBroken(true)}
        />
        {burst > 0 && (
          <span key={burst} className={s.burst} aria-hidden="true">
            <Icon name="heart-filled" size={96} />
          </span>
        )}
      </button>
    );
  } else if (work.kind === 'video') {
    media = (
      <button
        type="button"
        className={`${s.media} ${s.mediaVideo}`}
        onClick={onOpen}
        aria-label={`Смотреть видео: ${work.title}`}
      >
        {work.posterUrl && (
          <img src={work.posterUrl} alt="" loading="lazy" decoding="async" className={s.mediaImg} />
        )}
        <span className={s.play} aria-hidden="true">
          <Icon name="play" size={26} />
        </span>
        <span className={s.videoTag}>Видео</span>
      </button>
    );
  } else if (work.kind === 'audio') {
    media = <AudioPlayer src={work.url} />;
  } else {
    const label = fileLabel(work.url);
    media = (
      <FileTile
        url={work.url}
        label={work.kind === 'image' && label === 'Файл' ? 'Изображение' : label}
      />
    );
  }

  return (
    <article className={s.card}>
      {media}
      <div className={s.caption}>
        <div className={s.captionText}>
          <span className={s.title}>{work.title}</span>
          {work.subtitle && <span className={s.subtitle}>{work.subtitle}</span>}
        </div>
        {canVote && <LikeButton liked={liked} onToggle={() => onLike(!liked)} />}
      </div>
    </article>
  );
};

export default WorkCard;
