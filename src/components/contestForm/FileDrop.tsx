import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { cx } from './fields';
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

export const formatSize = (bytes: number) => {
  const mb = bytes / 1024 / 1024;
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0).replace('.', ',')} МБ`;
  return `${(mb / 1024).toFixed(1).replace('.', ',')} ГБ`;
};

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
  const [url, setUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Ссылка на файл для превью; освобождаем при смене файла.
  useEffect(() => {
    setPreviewFailed(false);
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

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

  const isImage = file?.type.startsWith('image/');
  const isVideo = file?.type.startsWith('video/');

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
            ↑
          </span>
          <span className={s.dropTitle}>
            Выберите файл <span className={s.dropOr}>или перетащите сюда</span>
          </span>
          <span className={s.dropHint}>Фото, видео, аудио или документ · до 2 ГБ</span>
        </label>
      ) : (
        <div className={cx(s.fileCard, dragging && s.dropActive)}>
          {url && isImage && !previewFailed && (
            <img
              src={url}
              alt="Превью выбранного файла"
              className={s.preview}
              onError={() => setPreviewFailed(true)}
            />
          )}
          {url && isVideo && !previewFailed && (
            <video
              src={url}
              controls
              playsInline
              preload="metadata"
              className={s.preview}
              onError={() => setPreviewFailed(true)}
            />
          )}
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
