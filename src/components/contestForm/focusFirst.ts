/** Ставит фокус на первое незаполненное поле (и прокручивает к нему). */
export const focusFirst = (ids: string[]) => {
  const el = ids.length ? document.getElementById(ids[0]) : null;
  if (!el) return;
  el.focus({ preventScroll: true });
  // Для файла фокус уходит на скрытый input — прокручиваем к его зоне.
  (el.nextElementSibling ?? el).scrollIntoView({ behavior: 'smooth', block: 'center' });
};
