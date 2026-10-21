import { plural } from './plural';

/** Возраст ребёнка словами: 0 → «менее 1 года», 5 → «5 лет». */
export const formatAge = (age: number) =>
  age < 1 ? 'менее 1 года' : `${age} ${plural(age, 'год', 'года', 'лет')}`;

/** Варианты для выпадающего списка возраста: «менее 1 года», 1–17. */
export const AGE_OPTIONS = Array.from({ length: 18 }, (_, age) => ({
  value: age,
  label: formatAge(age),
}));
