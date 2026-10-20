import { Link } from 'react-router-dom';
import VkLoginButton from './VkLoginButton';

interface Props {
  /** Класс обёртки — у разных страниц свои стили контейнера. */
  containerClassName: string;
  innerClassName: string;
  showBackLink?: boolean;
  message?: string;
}

const DEFAULT_MESSAGE = 'Войдите, чтобы участвовать в голосовании.';

/** Экран «нужна авторизация» с кнопкой входа через VK ID. */
const AuthRequired = ({
  containerClassName,
  innerClassName,
  showBackLink,
  message = DEFAULT_MESSAGE,
}: Props) => (
  <div className={containerClassName}>
    {showBackLink && (
      <Link to="/" className="back-link">
        ← Назад
      </Link>
    )}
    <div className={innerClassName}>
      <div className="icon">🔐</div>
      <h2>Требуется авторизация</h2>
      <p>{message}</p>
      <VkLoginButton />
    </div>
  </div>
);

export default AuthRequired;
