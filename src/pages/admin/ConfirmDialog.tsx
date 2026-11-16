import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import a from './admin.module.scss';

interface Props {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Подтверждение действия: Esc и клик мимо окна — отмена. */
const ConfirmDialog = ({ title, text, confirmLabel, onConfirm, onCancel }: Props) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, [onCancel]);

  return createPortal(
    <div className={a.overlay} onClick={onCancel}>
      <div
        className={a.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-text"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className={a.dialogTitle}>
          {title}
        </h2>
        <p id="confirm-text" className={a.dialogText}>
          {text}
        </p>
        <div className={a.dialogActions}>
          <button ref={cancelRef} type="button" className={a.secondary} onClick={onCancel}>
            Отмена
          </button>
          <button type="button" className={a.primary} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfirmDialog;
