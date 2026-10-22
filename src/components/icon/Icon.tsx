// Иконки интерфейса — inline SVG, а не символы шрифта (→, ↑, ‹, ×).
// Символы стрелок есть не во всех шрифтах: браузер берёт их из системного шрифта,
// и на Windows, Mac и Android они разного размера и сидят на разной высоте.
// SVG рисуется одинаково везде и всегда ровно по центру своего квадрата.

const HEART =
  'M12 20.5s-7.5-4.6-9.6-9.2C1 8.2 2.9 4.5 6.6 4.5c2.1 0 3.6 1.1 4.4 2.4h2c.8-1.3 2.3-2.4 4.4-2.4 3.7 0 5.6 3.7 4.2 6.8-2.1 4.6-9.6 9.2-9.6 9.2z';

/** Контурные иконки (линией). */
const STROKE = {
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  'arrow-up': 'M12 19V5M6 11l6-6 6 6',
  'chevron-left': 'M15 6l-6 6 6 6',
  close: 'M6 6l12 12M18 6L6 18',
  heart: HEART,
} as const;

/** Залитые иконки. */
const FILL = {
  'heart-filled': HEART,
  play: 'M8 5.5v13l11-6.5z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
} as const;

export type IconName = keyof typeof STROKE | keyof typeof FILL;

interface Props {
  name: IconName;
  /** Размер в пикселях (ширина = высота). */
  size?: number;
  className?: string;
}

/** Иконка цвета текста (currentColor). Декоративная: подпись даёт сам элемент вокруг. */
const Icon = ({ name, size = 20, className }: Props) => {
  const filled = name in FILL;
  const d = filled ? FILL[name as keyof typeof FILL] : STROKE[name as keyof typeof STROKE];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={name === 'heart' ? 2 : 2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ display: 'block', flex: 'none' }}
    >
      <path d={d} />
    </svg>
  );
};

export default Icon;
