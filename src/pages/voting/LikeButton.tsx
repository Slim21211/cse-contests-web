import Icon from '../../components/icon/Icon';
import s from './voting.module.scss';

interface Props {
  liked: boolean;
  onToggle: () => void;
  /** dark — на тёмном фоне просмотрщика. */
  variant?: 'light' | 'dark';
}

/** Круглая кнопка-сердце. Число лайков не показываем — только свой лайк. */
const LikeButton = ({ liked, onToggle, variant = 'light' }: Props) => (
  <button
    type="button"
    className={[s.like, variant === 'dark' ? s.likeDark : '', liked ? s.likeOn : ''].join(' ')}
    aria-pressed={liked}
    aria-label={liked ? 'Убрать лайк' : 'Поставить лайк'}
    onClick={onToggle}
  >
    <Icon name={liked ? 'heart-filled' : 'heart'} size={26} />
  </button>
);

export default LikeButton;
