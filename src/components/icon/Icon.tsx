// Иконки интерфейса — inline SVG, а не символы шрифта (→, ↑, ‹).
// Символы стрелок есть не во всех шрифтах: браузер берёт их из системного шрифта,
// и на Windows, Mac и Android они разного размера и сидят на разной высоте.
// SVG рисуется одинаково везде и всегда ровно по центру своего квадрата.

const PATHS = {
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'arrow-left': 'M19 12H5M11 6l-6 6 6 6',
  'arrow-up': 'M12 19V5M6 11l6-6 6 6',
  'chevron-left': 'M15 6l-6 6 6 6',
} as const;

export type IconName = keyof typeof PATHS;

interface Props {
  name: IconName;
  /** Размер в пикселях (ширина = высота). */
  size?: number;
  className?: string;
}

/** Иконка цвета текста (currentColor). Декоративная: подпись даёт сам элемент вокруг. */
const Icon = ({ name, size = 20, className }: Props) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={className}
    style={{ display: 'block', flex: 'none' }}
  >
    <path d={PATHS[name]} />
  </svg>
);

export default Icon;
