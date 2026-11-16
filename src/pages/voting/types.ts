import type { WorkKind } from '../../utils/workKind';

/** Работа в ленте голосования — общий вид для всех трёх конкурсов. */
export interface Work {
  id: string;
  url: string;
  posterUrl?: string | null;
  rotation: number;
  kind: WorkKind;
  /** Своя работа: лайкнуть нельзя. */
  isMine: boolean;
  /** Крупная строка: название работы или команды. */
  title: string;
  /** Вторая строка: автор, возраст, город. */
  subtitle: string;
}
