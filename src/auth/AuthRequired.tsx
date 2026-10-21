import { useState } from 'react';
import { Link } from 'react-router-dom';
import VkLoginButton from './VkLoginButton';
import { SUBMISSION_DEADLINE, isSubmissionClosed } from '../config';
import styles from './authRequired.module.scss';

interface Props {
  /** Короткая подсказка над кнопкой входа: зачем входить на этой странице. */
  message?: string;
  showBackLink?: boolean;
  /** Устаревшие параметры раскладки — страница входа теперь со своей вёрсткой. */
  containerClassName?: string;
  innerClassName?: string;
}

/** Год, который встречаем: с июля показываем уже следующий. */
const festiveYear = () => {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
};

const formatDeadline = (date: Date) =>
  date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' });

/** Белый логотип КСЭ из public/logo-white.png; если файла нет — текстовый знак. */
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

/** Страница входа: оранжевая шапка с названием, ниже — описание, срок приёма работ и кнопка VK ID. */
const AuthRequired = ({ message, showBackLink }: Props) => (
  <main className={styles.page}>
    <section className={styles.brand}>
      <span className={styles.year} aria-hidden="true">
        {festiveYear()}
      </span>

      <div className={styles.brandTop}>
        <Logo />
        {showBackLink && (
          <Link to="/" className={styles.back}>
            ← На главную
          </Link>
        )}
      </div>

      <h1 className={styles.title}>Новогодние конкурсы КСЭ</h1>
    </section>

    <section className={styles.sheet}>
      <div className={styles.sheetInner}>
        <p className={styles.lead} lang="ru">
          Сотрудники КСЭ и их семьи подают работы на <b>детский</b>, <b>командный</b> и{' '}
          <b>индивидуальный</b> конкурсы и голосуют за лучшие.
        </p>

        {SUBMISSION_DEADLINE && (
          <div className={styles.deadline}>
            <span className={styles.deadlineLabel}>Приём работ</span>
            <span className={styles.deadlineValue}>
              {isSubmissionClosed() ? 'завершён' : `до ${formatDeadline(SUBMISSION_DEADLINE)}`}
            </span>
          </div>
        )}

        <div className={styles.login}>
          {message && <p className={styles.message}>{message}</p>}
          <VkLoginButton />
        </div>

        <p className={styles.privacy}>
          Вход через VK — только чтобы подтвердить, что вы — это вы. Сохраняем лишь VK ID: без
          фото, контактов и друзей.
        </p>
      </div>
    </section>
  </main>
);

export default AuthRequired;
