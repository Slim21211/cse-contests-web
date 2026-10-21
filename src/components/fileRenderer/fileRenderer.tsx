import React, { useState, useRef, useEffect } from 'react';
import Lightbox from '../lightbox/lightbox';
import styles from './fileRenderer.module.scss';

interface FileRendererProps {
  filePath: string;
  rotation?: number;
  /** Обложка видео: если есть, сначала показываем её, а видео грузим по клику. */
  posterUrl?: string | null;
}

const FileRenderer: React.FC<FileRendererProps> = ({
  filePath,
  rotation = 0,
  posterUrl,
}) => {
  const [showLightbox, setShowLightbox] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 🆕 КРИТИЧЕСКИ ВАЖНО: Сбрасываем состояние при размонтировании
  useEffect(() => {
    return () => {
      setVideoError(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.load();
      }
    };
  }, []);

  // 🆕 Сбрасываем состояние при смене файла
  useEffect(() => {
    setVideoError(false);
    setVideoStarted(false);
  }, [filePath]);

  if (!filePath) {
    return <div className={styles.fallback}>Файл отсутствует</div>;
  }

  const url = filePath;
  const ext = (filePath.split('.').pop()?.split('?')[0] || '').toLowerCase();

  // === АУДИО (MP3, WAV, AAC, OGG Audio) ===
  if (['mp3', 'wav', 'aac', 'oga'].includes(ext)) {
    return (
      <div className={styles.documentPreview}>
        <div className={styles.documentIcon}>🎧</div>
        <div className={styles.documentInfo}>
          <span className={styles.documentType}>Аудиозапись</span>
          <audio
            src={url}
            controls
            preload="metadata"
            className={styles.audioPlayer}
          >
            Ваш браузер не поддерживает аудио.
          </audio>
        </div>
      </div>
    );
  }

  // === ВИДЕО ===
  if (['mp4', 'mov', 'webm', 'ogg', 'avi', 'mkv'].includes(ext)) {
    const handleRetry = () => {
      setVideoError(false);

      // 🆕 Принудительно очищаем video element
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();

        // Небольшая задержка перед загрузкой
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.load();
          }
        }, 200);
      }
    };

    // Обложка вместо тяжёлого видео: ролик начинает грузиться только по клику.
    if (posterUrl && !videoStarted) {
      return (
        <div className={styles.mediaContainer}>
          <button
            type="button"
            className={styles.posterButton}
            onClick={() => setVideoStarted(true)}
            aria-label="Смотреть видео"
          >
            <img src={posterUrl} alt="" loading="lazy" className={styles.media} />
            <span className={styles.playIcon} aria-hidden="true" />
          </button>
        </div>
      );
    }

    // Без cache-buster: файлы неизменны, браузер может брать видео из кэша.
    const videoUrl = url;

    return (
      <div className={styles.mediaContainer}>
        {videoError ? (
          <div className={styles.fallback}>
            <p>⚠️ Не удалось загрузить видео</p>
            <button
              onClick={handleRetry}
              style={{
                marginTop: '12px',
                padding: '10px 20px',
                background: '#fe5000',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              🔄 Попробовать снова
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            key={videoUrl}
            controls
            playsInline
            preload="metadata"
            autoPlay={videoStarted}
            poster={posterUrl ?? undefined}
            className={styles.media}
            onError={() => {
              setVideoError(true);
            }}
            onLoadStart={() => {
              setVideoError(false);
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              background: '#000',
            }}
          >
            <source src={videoUrl} />
            <track kind="captions" />
            Ваш браузер не поддерживает видео.
          </video>
        )}
      </div>
    );
  }

  // === ИЗОБРАЖЕНИЯ ===
  if (
    [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'webp',
      'avif',
      'bmp',
      'svg',
      'heic',
      'heif',
    ].includes(ext)
  ) {
    // Если ошибка загрузки - показываем как документ
    if (imageError) {
      return (
        <div className={styles.documentPreview}>
          <div className={styles.documentIcon}>🖼️</div>
          <div className={styles.documentInfo}>
            <span className={styles.documentType}>
              {ext.toUpperCase()} изображение
            </span>
            {['heic', 'heif'].includes(ext) && (
              <p style={{ fontSize: '12px', color: '#999', margin: '8px 0' }}>
                Формат не поддерживается браузером
              </p>
            )}
            <a
              href={filePath}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.documentLink}
            >
              Открыть файл
            </a>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className={styles.mediaContainer}>
          {imageLoading && (
            <div className={styles.loader}>
              <div className={styles.spinner}></div>
              <span>Загрузка изображения...</span>
            </div>
          )}
          <img
            src={filePath}
            alt="Работа"
            className={`${styles.media} ${imageLoading ? styles.hidden : ''}`}
            loading="lazy"
            onClick={() => !imageLoading && setShowLightbox(true)}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            style={{
              cursor: imageLoading ? 'default' : 'zoom-in',
              transform: `rotate(${rotation}deg)`,
            }}
          />
        </div>
        {showLightbox && (
          <Lightbox
            imageUrl={filePath}
            rotation={rotation}
            onClose={() => setShowLightbox(false)}
          />
        )}
      </>
    );
  }

  // === PDF ===
  if (ext === 'pdf') {
    return (
      <div className={styles.documentPreview}>
        <div className={styles.documentIcon}>📄</div>
        <div className={styles.documentInfo}>
          <span className={styles.documentType}>PDF документ</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.documentLink}
          >
            Открыть файл
          </a>
        </div>
      </div>
    );
  }

  // === DOC, DOCX, TXT, RTF ===
  if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
    return (
      <div className={styles.documentPreview}>
        <div className={styles.documentIcon}>📝</div>
        <div className={styles.documentInfo}>
          <span className={styles.documentType}>
            {ext.toUpperCase()} документ
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.documentLink}
          >
            Скачать файл
          </a>
        </div>
      </div>
    );
  }

  // === PPT, PPTX ===
  if (['ppt', 'pptx'].includes(ext)) {
    return (
      <div className={styles.documentPreview}>
        <div className={styles.documentIcon}>📊</div>
        <div className={styles.documentInfo}>
          <span className={styles.documentType}>Презентация</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.documentLink}
          >
            Скачать файл
          </a>
        </div>
      </div>
    );
  }

  // === XLS, XLSX, CSV ===
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return (
      <div className={styles.documentPreview}>
        <div className={styles.documentIcon}>📈</div>
        <div className={styles.documentInfo}>
          <span className={styles.documentType}>Таблица</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.documentLink}
          >
            Скачать файл
          </a>
        </div>
      </div>
    );
  }

  // === ZIP, RAR, 7Z, TAR, GZ ===
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return (
      <div className={styles.documentPreview}>
        <div className={styles.documentIcon}>📦</div>
        <div className={styles.documentInfo}>
          <span className={styles.documentType}>Архив</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.documentLink}
          >
            Скачать архив
          </a>
        </div>
      </div>
    );
  }

  // === Другие файлы ===
  return (
    <div className={styles.documentPreview}>
      <div className={styles.documentIcon}>📎</div>
      <div className={styles.documentInfo}>
        <span className={styles.documentType}>{ext.toUpperCase()} файл</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.documentLink}
        >
          Открыть файл
        </a>
      </div>
    </div>
  );
};

export default FileRenderer;
