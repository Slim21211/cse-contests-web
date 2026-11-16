/** Размер файла по-русски: «820 КБ», «4,5 МБ», «1,2 ГБ». */
export const formatSize = (bytes: number) => {
  const mb = bytes / 1024 / 1024;
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0).replace('.', ',')} МБ`;
  return `${(mb / 1024).toFixed(1).replace('.', ',')} ГБ`;
};
