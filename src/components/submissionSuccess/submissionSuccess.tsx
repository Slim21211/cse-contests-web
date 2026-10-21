import { Link } from 'react-router-dom';

interface SubmissionSuccessProps {
  /** Очистить форму для следующей работы. */
  onSubmitAnother: () => void;
}

/** Экран после успешной отправки: форма скрывается, повторно ту же работу не отправить. */
const SubmissionSuccess = ({ onSubmitAnother }: SubmissionSuccessProps) => (
  <div className="submission-success">
    <h2>Заявка отправлена</h2>
    <p>Работа загружена и появится в голосовании после проверки организаторами.</p>
    <div className="submission-success-actions">
      <Link to="/" className="submit-button">
        К списку конкурсов
      </Link>
      <button type="button" className="secondary-button" onClick={onSubmitAnother}>
        Отправить ещё одну работу
      </button>
    </div>
  </div>
);

export default SubmissionSuccess;
