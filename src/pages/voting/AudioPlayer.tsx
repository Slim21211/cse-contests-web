import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Icon from '../../components/icon/Icon';
import s from './voting.module.scss';

const fmt = (sec: number) => {
  if (!Number.isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  return `${m}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
};

/** Свой аудиоплеер: одинаковый во всех браузерах (у системного вид везде разный). */
const AudioPlayer = ({ src }: { src: string }) => {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => setDuration(a.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => setFailed(true);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('durationchange', onMeta);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onPause);
    a.addEventListener('error', onError);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('durationchange', onMeta);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onPause);
      a.removeEventListener('error', onError);
    };
  }, []);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => setFailed(true));
    else a.pause();
  };

  if (failed) {
    return (
      <div className={s.audio}>
        <span className={s.audioLabel}>Аудиозапись не воспроизводится в браузере</span>
        <a className={s.fileButton} href={src} target="_blank" rel="noreferrer">
          Скачать
        </a>
      </div>
    );
  }

  return (
    <div className={s.audio}>
      <audio ref={ref} src={src} preload="metadata" />
      <button
        type="button"
        className={s.audioPlay}
        onClick={toggle}
        aria-label={playing ? 'Пауза' : 'Слушать'}
      >
        <Icon name={playing ? 'pause' : 'play'} size={22} />
      </button>
      <div className={s.audioBody}>
        <span className={s.audioLabel}>Аудиозапись</span>
        <input
          type="range"
          className={s.audioSeek}
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(time, duration || 0)}
          onChange={(e) => {
            if (ref.current) ref.current.currentTime = Number(e.target.value);
          }}
          aria-label="Перемотка"
          style={{ '--p': `${duration ? (time / duration) * 100 : 0}%` } as CSSProperties}
        />
      </div>
      <span className={s.audioTime}>
        {fmt(time)} / {fmt(duration)}
      </span>
    </div>
  );
};

export default AudioPlayer;
