// Как показывать работу в ленте — по расширению файла.

export type WorkKind = 'image' | 'video' | 'audio' | 'pdf' | 'file';

const IMAGE = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg', 'heic', 'heif'];
const VIDEO = ['mp4', 'mov', 'webm', 'ogg', 'avi', 'mkv', 'm4v'];
const AUDIO = ['mp3', 'wav', 'aac', 'oga', 'm4a'];

export const extOf = (url: string) =>
  (url.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase();

export const kindOf = (url: string): WorkKind => {
  const ext = extOf(url);
  if (IMAGE.includes(ext)) return 'image';
  if (VIDEO.includes(ext)) return 'video';
  if (AUDIO.includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  return 'file';
};

const FILE_NAMES: Record<string, string> = {
  doc: 'Документ Word',
  docx: 'Документ Word',
  txt: 'Текстовый файл',
  rtf: 'Документ RTF',
  ppt: 'Презентация',
  pptx: 'Презентация',
  xls: 'Таблица',
  xlsx: 'Таблица',
  csv: 'Таблица',
  zip: 'Архив',
  rar: 'Архив',
  '7z': 'Архив',
  heic: 'Фото HEIC',
  heif: 'Фото HEIF',
};

/** Подпись для плашки файла: «Презентация», «Архив» и т. п. */
export const fileLabel = (url: string) => {
  const ext = extOf(url);
  if (ext === 'pdf') return 'Документ PDF';
  return FILE_NAMES[ext] ?? 'Файл';
};

/** Короткая метка на плашке: PDF, DOCX, ZIP… */
export const extBadge = (url: string) => extOf(url).toUpperCase().slice(0, 4) || 'FILE';
