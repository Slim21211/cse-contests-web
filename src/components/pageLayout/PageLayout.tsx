import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import BrandHeader from '../brandHeader/brandHeader';
import Icon from '../icon/Icon';
import s from './pageLayout.module.scss';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Куда ведёт «На главную» (например, на вкладку голосования). */
  backTo?: string;
  /** Контурный год в шапке, если не текущий сезон. */
  year?: number;
  children: ReactNode;
}

/** Каркас внутренних страниц: шапка с «На главную» и белый лист. */
const PageLayout = ({ title, subtitle, backTo = '/', year, children }: Props) => (
  <div className={s.page}>
    <BrandHeader
      title={title}
      subtitle={subtitle}
      year={year}
      actions={
        <Link to={backTo} className={s.back}>
          <Icon name="chevron-left" size={18} className={s.backChevron} />
          На главную
        </Link>
      }
    />
    <main className={s.sheet}>{children}</main>
  </div>
);

interface NoticeProps {
  title: string;
  text?: ReactNode;
  /** Кнопка-ссылка под текстом. */
  action?: { to: string; label: string };
}

/** Сообщение на месте содержимого: «Голосование завершено», «Итоги ещё не подведены»… */
export const PageNotice = ({ title, text, action }: NoticeProps) => (
  <div className={s.notice}>
    <h2 className={s.noticeTitle}>{title}</h2>
    {text && <p className={s.noticeText}>{text}</p>}
    {action && (
      <Link to={action.to} className={s.noticeButton}>
        {action.label}
      </Link>
    )}
  </div>
);

export default PageLayout;
