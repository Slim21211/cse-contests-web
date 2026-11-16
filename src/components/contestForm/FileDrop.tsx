import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { cx } from '../../utils/cx';
import { formatSize } from '../../utils/formatSize';
import Icon from '../icon/Icon';
import s from './contestForm.module.scss';

interface Props {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  invalid?: boolean;
  accept?: string;
}

const kindOf = (file: File) => {
  if (file.type.startsWith('image/')) return 'Фото';
  if (file.type.startsWith('video/')) return 'Видео';
  if (file.type.startsWith('audio/')) return 'Аудио';
  if (file.type.includes('pdf')) return 'PDF';
  return 'Файл';
};

/**
 * Превью выбранного фото или видео. Ссылку на файл создаёт и освобождает эффект,
 * прямо в элементе. Компонент пересоздаётся при смене файла (key), так что
 * previewFailed сбрасывается сам.
 */
const FilePreview = ({ file }: { file: File }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  useEffect(() => {
    const el = imgRef.current ?? videoRef.current;
    if (!el) return;
    const url = URL.createObjectURL(file);
    el.src = url;
    return () => {
      el.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (previewFailed) return null;
  if (isImage) {
    return (
      <img
        ref={imgRef}
        alt="Превью выбранного файла"
        className={s.preview}
        onError={() => setPreviewFailed(true)}
      />
    );
  }
  if (isVideo) {
    return (
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        className={s.preview}
        onError={() => setPreviewFailed(true)}
      />
    );
  }
  return null;
};

/** Ключ файла для пересоздания превью. */
const fileKey = (f: File) => `${f.name}:${f.size}:${f.lastModified}`;

/** Выбор файла: зона «нажмите или перетащите», после выбора — превью и «Заменить». */
const FileDrop = ({
  id,
  file,
  onChange,
  disabled,
  invalid,
  accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.rtf,.ppt,.pptx,.xls,.xlsx,.csv,.zip,.rar,.7z,.heic,.heif',
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.files?.[0] ?? null);
    e.target.value = ''; // чтобы можно было выбрать тот же файл ещё раз
  };

  const onDragOver = (e: DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    setDragging(true);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onChange(dropped);
  };

  return (
    <div onDragOver={onDragOver} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={pick}
        disabled={disabled}
        className={s.fileInput}
        aria-invalid={invalid || undefined}
      />

      {!file ? (
        <label
          htmlFor={id}
          className={cx(s.drop, dragging && s.dropActive, invalid && s.dropInvalid)}
        >
          <span className={s.dropIcon} aria-hidden="true">
            <Icon name="arrow-up" size={22} />
          </span>
          <span className={s.dropTitle}>
            Выберите файл <span className={s.dropOr}>или перетащите сюда</span>
          </span>
          <span className={s.dropHint}>Фото, видео, аудио или документ · до 2 ГБ</span>
        </label>
      ) : (
        <div className={cx(s.fileCard, dragging && s.dropActive)}>
          <FilePreview key={fileKey(file)} file={file} />
          <div className={s.fileRow}>
            <span className={s.fileMeta}>
              <span className={s.fileName}>{file.name}</span>
              <span className={s.fileInfo}>
                {kindOf(file)} · {formatSize(file.size)}
              </span>
            </span>
            <button
              type="button"
              className={s.replace}
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              Заменить
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDrop;
