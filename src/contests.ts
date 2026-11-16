// Три конкурса сайта: идентификаторы (они же префиксы таблиц <contest>_contest, <contest>_votes,
// <contest>_works и папок в бакете) и подписи.

export type ContestType = 'child' | 'team' | 'individual';

export const CONTESTS: ContestType[] = ['child', 'team', 'individual'];

/** Заголовки страниц: «Детский конкурс». */
export const CONTEST_TITLES: Record<ContestType, string> = {
  child: 'Детский конкурс',
  team: 'Командный конкурс',
  individual: 'Индивидуальный конкурс',
};

/** Короткие подписи вкладок в админке и итогах. */
export const CONTEST_TABS: Record<ContestType, string> = {
  child: '🎄 Детский',
  team: '✨ Командный',
  individual: '⭐ Индивидуальный',
};
