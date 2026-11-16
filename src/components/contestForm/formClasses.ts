import { cx } from '../../utils/cx';
import s from './contestForm.module.scss';

/** Классы формы и полей ввода — чтобы формы не импортировали стили напрямую. */
export const formClass = s.form;
export const inputClass = s.input;
export const selectClass = cx(s.input, s.select);
export const textareaClass = cx(s.input, s.textarea);
