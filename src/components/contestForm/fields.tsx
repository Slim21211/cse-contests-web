import type { ReactNode } from 'react';
import s from './contestForm.module.scss';

export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(' ');

/** Группа полей с заголовком: «Сотрудник», «Ребёнок», «Работа». */
export const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <fieldset className={s.group}>
    <legend className={s.legend}>{title}</legend>
    <div className={s.groupBody}>{children}</div>
  </fieldset>
);

/**
 * Два поля в строку. narrowLast — второе поле узкое и стоит рядом даже на телефоне
 * (имя + возраст); без него на телефоне поля идут друг под другом.
 */
export const Row = ({ children, narrowLast }: { children: ReactNode; narrowLast?: boolean }) => (
  <div className={cx(s.row, narrowLast && s.rowNarrowLast)}>{children}</div>
);

interface FieldProps {
  id: string;
  label: string;
  invalid?: boolean;
  children: ReactNode;
}

/** Подпись + поле. Все поля обязательные — отмечены звёздочкой. */
export const Field = ({ id, label, invalid, children }: FieldProps) => (
  <div className={cx(s.field, invalid && s.fieldInvalid)}>
    <label htmlFor={id} className={s.label}>
      {label}
      <span className={s.required} aria-hidden="true">
        *
      </span>
    </label>
    {children}
  </div>
);

/** Классы формы и полей ввода — чтобы формы не импортировали стили напрямую. */
export const formClass = s.form;
export const inputClass = s.input;
export const selectClass = cx(s.input, s.select);
export const textareaClass = cx(s.input, s.textarea);
