import type { WorkKind } from './workKind';

/** Работа в ленте голосования — общий вид для всех трёх конкурсов. */
export interface Work {
  id: string;
  url: string;
  posterUrl?: string | null;
  rotation: number;
  kind: WorkKind;
  /** Крупная строка: название работы или команды. */
  title: string;
  /** Вторая строка: автор, возраст, город. */
  subtitle: string;
}
