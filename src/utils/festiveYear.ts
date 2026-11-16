/**
 * Год, который встречаем (по Москве): с июля показываем уже следующий.
 * Это же — номер сезона конкурса: так же его считают база (current_season()) и функция загрузки.
 */
export const festiveYear = (now = new Date()) => {
  const msk = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return msk.getUTCMonth() >= 6 ? msk.getUTCFullYear() + 1 : msk.getUTCFullYear();
};
