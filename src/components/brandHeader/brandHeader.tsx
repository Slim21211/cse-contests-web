import { useState, type ReactNode } from 'react';
import { festiveYear } from '../../utils/festiveYear';
import styles from './brandHeader.module.scss';

interface Props {
  title: ReactNode;
  /** Строка над заголовком, например «Привет, Владимир!». */
  greeting?: ReactNode;
  /** Ссылки и кнопки справа от логотипа. */
  actions?: ReactNode;
}

const Logo = () => {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={styles.wordmark}>КСЭ</span>;
  return (
    <img
      src="/logo-white.png"
      alt="КСЭ — Курьер Сервис Экспресс"
      className={styles.logo}
      onError={() => setFailed(true)}
    />
  );
};

/** Оранжевая шапка страниц сайта: логотип, действия, приветствие, заголовок и контурный год. */
const BrandHeader = ({ title, greeting, actions }: Props) => (
  <header className={styles.header}>
    <span className={styles.year} aria-hidden="true">
      {festiveYear()}
    </span>
    <div className={styles.inner}>
      <div className={styles.top}>
        <Logo />
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      <div className={styles.heading}>
        {greeting && <p className={styles.greeting}>{greeting}</p>}
        <h1 className={styles.title}>{title}</h1>
      </div>
    </div>
  </header>
);

export default BrandHeader;
