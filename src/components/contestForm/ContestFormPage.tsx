import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import BrandHeader from '../brandHeader/brandHeader';
import Icon from '../icon/Icon';
import { supabase } from '../../lib/supabase';
import {
  useSiteSettings,
  isSubmissionClosed,
  formatDay,
} from '../../settings/siteSettings';
import { plural } from '../../utils/plural';
import type { ContestType } from '../../utils/uploadUtils';
import s from './contestForm.module.scss';

const TITLES: Record<ContestType, string> = {
  child: 'Детский конкурс',
  team: 'Командный конкурс',
  individual: 'Индивидуальный конкурс',
};

/** Сколько активных работ пользователь уже подал в этот конкурс. */
const useMyCount = (
  contest: ContestType,
  userId: number | undefined,
  refresh: unknown
) => {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from(`${contest}_contest`)
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('vk_user_id', userId)
      .then(({ count: c }) => {
        if (!cancelled) setCount(c ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [contest, userId, refresh]);
  return count;
};

interface Props {
  contest: ContestType;
  userId?: number;
  /** Правая колонка с подсказками (на десктопе) — только у самой формы. */
  withAside?: boolean;
  /** Меняется после успешной отправки — обновить счётчик «ваших» работ. */
  refreshKey?: unknown;
  children: ReactNode;
}

/** Каркас страниц подачи работы: шапка, белый лист, на десктопе — колонка с подсказками. */
const ContestFormPage = ({
  contest,
  userId,
  withAside,
  refreshKey,
  children,
}: Props) => {
  const { settings } = useSiteSettings();
  const mine = useMyCount(contest, withAside ? userId : undefined, refreshKey);
  const deadline = settings.submissionDeadline;
  const closed = isSubmissionClosed(settings);

  const subtitle = deadline
    ? closed
      ? `Приём работ завершён ${formatDay(deadline)}`
      : `Приём работ до ${formatDay(deadline)}`
    : undefined;

  return (
    <div className={s.page}>
      <BrandHeader
        title={TITLES[contest]}
        subtitle={subtitle}
        actions={
          <Link to="/" className={s.back}>
            <Icon name="chevron-left" size={18} className={s.backChevron} />
            <span className={s.backText}>На главную</span>
          </Link>
        }
      />

      <main className={s.sheet}>
        <div className={withAside ? s.layout : s.single}>
          <div className={s.content}>{children}</div>

          {withAside && (
            <aside className={s.aside}>
              {deadline && (
                <div className={s.asideDeadline}>
                  <span className={s.asideLabel}>Приём работ</span>
                  <span className={s.asideValue}>до {formatDay(deadline)}</span>
                </div>
              )}
              {mine !== null && mine > 0 && (
                <div className={s.asideMine}>
                  <span className={s.mineBadge}>
                    {mine} {plural(mine, 'ваша', 'ваших', 'ваших')}
                  </span>
                  <span>
                    {plural(mine, 'работа', 'работы', 'работ')} уже в этом
                    конкурсе
                  </span>
                </div>
              )}
              <ul className={s.rules}>
                <li>
                  Можно отправить несколько работ — каждую отдельной заявкой.
                </li>
                <li>
                  Работа появится в голосовании после проверки организаторами.
                </li>
                <li>
                  Большие видео грузятся частями: при обрыве связи загрузка
                  продолжится сама.
                </li>
              </ul>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
};

export default ContestFormPage;
