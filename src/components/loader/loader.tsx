import styles from './loader.module.scss';

interface LoaderProps {
  /** Подпись под спиннером, например «Загрузка работ…». */
  label?: string;
  /** На весь экран (проверка входа) или внутри блока (списки). */
  fullScreen?: boolean;
}

/** Единый индикатор загрузки сайта. */
const Loader = ({ label, fullScreen = false }: LoaderProps) => (
  <div className={fullScreen ? styles.fullScreen : styles.inline} role="status" aria-live="polite">
    <span className={styles.spinner} aria-hidden="true" />
    {label && <span className={styles.label}>{label}</span>}
  </div>
);

export default Loader;
