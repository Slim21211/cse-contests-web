import { Link } from 'react-router-dom';
import { cx } from './fields';
import s from './contestForm.module.scss';

/** Экран после отправки: форма скрыта, повторно ту же работу не отправить. */
export const SubmissionSuccess = ({ onSubmitAnother }: { onSubmitAnother: () => void }) => (
  <div className={s.notice} role="status">
    <span className={cx(s.noticeMark, s.noticeMarkOk)} aria-hidden="true" />
    <h2 className={s.noticeTitle}>Работа отправлена</h2>
    <p className={s.noticeText}>Она появится в голосовании после проверки организаторами.</p>
    <div className={s.noticeActions}>
      <Link to="/" className={s.submit}>
        На главную
      </Link>
      <button type="button" className={s.secondary} onClick={onSubmitAnother}>
        Отправить ещё одну работу
      </button>
    </div>
  </div>
);

/** Приём работ завершён: вместо формы. */
export const SubmissionClosed = () => (
  <div className={s.notice}>
    <h2 className={s.noticeTitle}>Приём работ завершён</h2>
    <p className={s.noticeText}>
      Идёт обработка работ перед голосованием. Голосование откроется на этом сайте.
    </p>
    <div className={s.noticeActions}>
      <Link to="/" className={s.submit}>
        На главную
      </Link>
    </div>
  </div>
);
