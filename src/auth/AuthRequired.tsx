import { useState } from 'react';
import { Link } from 'react-router-dom';
import VkLoginButton from './VkLoginButton';
import styles from './authRequired.module.scss';

interface Props {
  /** Пояснение под заголовком: зачем входить на этой странице. */
  message?: string;
  showBackLink?: boolean;
  /** Устаревшие параметры раскладки — страница входа теперь со своей вёрсткой. */
  containerClassName?: string;
  innerClassName?: string;
}

const DEFAULT_MESSAGE = 'Войдите, чтобы подать работу или проголосовать.';

/** Логотип КСЭ из public/logo.png; пока файла нет — текстовый знак. */
const Logo = () => {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className={styles.wordmark}>КСЭ</span>;
  return (
    <img
      src="/logo.png"
      alt="КСЭ"
      className={styles.logo}
      onError={() => setFailed(true)}
    />
  );
};

/** Страница входа: что это за сайт, кнопка VK ID и что мы сохраняем. */
const AuthRequired = ({ message = DEFAULT_MESSAGE, showBackLink }: Props) => (
  <main className={styles.page}>
    <div className={styles.card}>
      {showBackLink && (
        <Link to="/" className={styles.back}>
          ← На главную
        </Link>
      )}

      <Logo />

      <h1 className={styles.title}>Новогодние конкурсы КСЭ</h1>
      <p className={styles.lead}>
        Здесь сотрудники КСЭ и их семьи подают работы на детский, командный и
        индивидуальный конкурсы и голосуют за лучшие.
      </p>

      <p className={styles.message}>{message}</p>

      <VkLoginButton />

      <p className={styles.privacy}>
        Вход через VK нужен только чтобы подтвердить, что вы — это вы. Мы
        сохраняем только ваш VK ID, без фото, контактов и списка друзей.
      </p>
    </div>
  </main>
);

export default AuthRequired;
