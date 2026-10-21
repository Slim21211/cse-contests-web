// Обложка для видео: кадр из начала ролика, сохранённый в JPEG прямо в браузере.
// Нужна, чтобы в голосовании и админке показывать лёгкую картинку, а видео
// грузить только по клику. Если браузер не смог прочитать видео — обложки нет,
// работа всё равно отправляется.

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'ogg', 'avi', 'mkv', 'm4v'];
const MAX_WIDTH = 960;
const TIMEOUT_MS = 15_000;

export const isVideoFile = (file: File) =>
  file.type.startsWith('video/') ||
  VIDEO_EXTENSIONS.includes((file.name.split('.').pop() ?? '').toLowerCase());

export const createVideoPoster = (file: File): Promise<File | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let finished = false;

    const finish = (result: File | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      resolve(result);
    };
    const timer = setTimeout(() => finish(null), TIMEOUT_MS);

    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;

    video.addEventListener('error', () => finish(null));
    video.addEventListener('loadedmetadata', () => {
      // Первый кадр часто чёрный — берём кадр на ~1 секунде (или 10% коротких роликов).
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      video.currentTime = Math.min(1, duration * 0.1);
    });
    video.addEventListener('seeked', () => {
      if (!video.videoWidth || !video.videoHeight) return finish(null);
      const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return finish(null);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return finish(null);
          const base = file.name.replace(/\.[^.]+$/, '') || 'video';
          finish(new File([blob], `${base}_poster.jpg`, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.82
      );
    });
  });
