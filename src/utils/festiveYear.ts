/** Год, который встречаем: с июля показываем уже следующий. */
export const festiveYear = (now = new Date()) =>
  now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
