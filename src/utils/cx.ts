/** Склеивает имена CSS-классов, пропуская пустые: cx(s.a, active && s.b). */
export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(' ');
