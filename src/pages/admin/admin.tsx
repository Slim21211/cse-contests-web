import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useCurrentUser, useIsAdmin, AuthRequired } from '../../auth';
import PageLayout, { PageNotice } from '../../components/pageLayout/PageLayout';
import ContestTabs from '../../components/contestTabs/ContestTabs';
import Loader from '../../components/loader/loader';
import WorkCard from '../voting/WorkCard';
import MediaViewer from '../voting/MediaViewer';
import { toWork, type Row } from '../voting/toWork';
import SiteSettingsPanel from './SiteSettingsPanel';
import ConfirmDialog from './ConfirmDialog';
import VotingStats from './VotingStats';
import { festiveYear } from '../../utils/festiveYear';
import { cx } from '../../utils/cx';
import type { ContestType } from '../../contests';
import type { ChildContestSubmission, TeamContestSubmission } from '../../types/database';
import v from '../voting/voting.module.scss';
import a from './admin.module.scss';

const DEFAULT_ENABLED: Record<ContestType, boolean> = { child: true, team: true, individual: true };

const noop = () => {};

/** Подробности, которые видят только админы. */
const Details = ({ contest, row }: { contest: ContestType; row: Row }) => {
  const lines: [string, string | undefined][] = [['Подразделение', row.department]];
  if (contest === 'child') lines.push(['Родитель', (row as ChildContestSubmission).full_name]);
  if (contest === 'team') lines.push(['Участники', (row as TeamContestSubmission).participants]);
  if (contest !== 'team') lines.push(['Город', row.city]);
  lines.push(['Подана', new Date(row.created_at).toLocaleDateString('ru-RU')]);
  return (
    <dl className={a.details}>
      {lines.map(([label, value]) => (
        <div key={label} className={a.detail}>
          <dt>{label}</dt>
          <dd>{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
};

const Admin = () => {
  const { user } = useCurrentUser();
  const isAdmin = useIsAdmin(user);
  const [contest, setContest] = useState<ContestType>('child');
  // Работы вместе с конкурсом, к которому относятся: пока грузится новый, старый список не показываем.
  const [loaded, setLoaded] = useState<{ contest: ContestType; works: Row[] | null } | null>(null);
  const [votingEnabled, setVotingEnabled] = useState(DEFAULT_ENABLED);
  const [toHide, setToHide] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const works = loaded?.contest === contest ? loaded.works : undefined;
  const setWorks = (update: (prev: Row[]) => Row[]) =>
    setLoaded((prev) => (prev?.works ? { ...prev, works: update(prev.works) } : prev));

  // Флаги голосования — один раз.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    supabase
      .from('contest_settings')
      .select('contest_type, voting_enabled')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Настройки голосования не загрузились:', error);
          return;
        }
        const enabled = { ...DEFAULT_ENABLED };
        data.forEach((row) => {
          enabled[row.contest_type as ContestType] = row.voting_enabled;
        });
        setVotingEnabled(enabled);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // Работы конкурса, только текущий сезон; прошлые остаются в базе.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    supabase
      .from(`${contest}_contest`)
      .select('*')
      .eq('season', festiveYear())
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error('Работы не загрузились:', error);
        setLoaded({ contest, works: error ? null : ((data ?? []) as Row[]) });
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, contest]);

  const closeViewer = useCallback(() => setOpenId(null), []);

  /** Обновляет работу; база может молча не тронуть строку (RLS) — это тоже ошибка. */
  const updateWork = async (id: string, patch: Record<string, unknown>, what: string) => {
    const { data, error } = await supabase
      .from(`${contest}_contest`)
      .update(patch)
      .eq('id', id)
      .select('id');
    if (error || !data?.length) {
      console.error(`Ошибка: ${what}`, error);
      alert(`Не удалось ${what}. ${error?.message ?? 'Нет прав или работа не найдена.'}`);
      return false;
    }
    setWorks((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    return true;
  };

  const toggleVoting = async () => {
    const target = contest;
    const newValue = !votingEnabled[target];
    const { data, error } = await supabase
      .from('contest_settings')
      .update({ voting_enabled: newValue, updated_at: new Date().toISOString() })
      .eq('contest_type', target)
      .select('contest_type');
    if (error || !data?.length) {
      console.error('Ошибка переключения голосования:', error);
      alert(
        'Не удалось переключить голосование. ' +
          (error?.message ?? 'В contest_settings нет строки для этого конкурса.'),
      );
      return;
    }
    setVotingEnabled((prev) => ({ ...prev, [target]: newValue }));
  };

  const hide = async () => {
    const id = toHide;
    setToHide(null);
    if (!id || !user) return;
    await updateWork(
      id,
      { is_active: false, moderated_at: new Date().toISOString(), moderated_by: user.id },
      'скрыть работу',
    );
  };

  if (!user) return <AuthRequired showBackLink />;

  let content;
  if (isAdmin === null) {
    content = <Loader label="Проверяем доступ…" />;
  } else if (!isAdmin) {
    content = (
      <PageNotice
        title="Нет доступа"
        text="Эта страница — для организаторов конкурса."
        action={{ to: '/', label: 'На главную' }}
      />
    );
  } else {
    const hidden = works?.filter((w) => !w.is_active).length ?? 0;
    const openRow = works?.find((w) => w.id === openId);
    content = (
      <>
        <SiteSettingsPanel />

        <section className={a.works} aria-labelledby="works-title">
          <div className={a.worksHead}>
            <h2 id="works-title" className={a.h2}>
              Работы
            </h2>
            <ContestTabs
              value={contest}
              onChange={(c) => {
                setContest(c);
                setOpenId(null);
              }}
            />
          </div>

          <div className={a.toolbar}>
            <span className={a.count}>
              {works
                ? `Всего: ${works.length}${hidden ? ` · скрыто: ${hidden}` : ''}`
                : 'Загрузка…'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={votingEnabled[contest]}
              className={a.switch}
              onClick={toggleVoting}
            >
              <span className={a.switchLabel}>Голосование в конкурсе</span>
              <span className={cx(a.switchTrack, votingEnabled[contest] && a.switchOn)}>
                <span className={a.switchThumb} />
              </span>
            </button>
          </div>

          <VotingStats contest={contest} />

          {works === undefined ? (
            <Loader label="Загрузка работ…" />
          ) : works === null ? (
            <PageNotice title="Не удалось загрузить работы" text="Обновите страницу." />
          ) : works.length === 0 ? (
            <PageNotice title="Пока нет работ" text="Здесь появятся работы этого сезона." />
          ) : (
            <div className={v.grid}>
              {works.map((row) => {
                const work = toWork(contest, row);
                return (
                  <WorkCard
                    key={row.id}
                    work={work}
                    liked={false}
                    canVote={false}
                    onLike={noop}
                    onOpen={() => setOpenId(row.id)}
                    dimmed={!row.is_active}
                    badge={!row.is_active && <span className={a.hiddenBadge}>Скрыта</span>}
                    aside={null}
                    footer={
                      <div className={a.cardFooter}>
                        <Details contest={contest} row={row} />
                        <div className={a.actions}>
                          {work.kind === 'image' && (
                            <button
                              type="button"
                              className={a.action}
                              onClick={() =>
                                updateWork(
                                  row.id,
                                  { rotation: ((row.rotation ?? 0) + 90) % 360 },
                                  'повернуть изображение',
                                )
                              }
                            >
                              Повернуть
                            </button>
                          )}
                          {row.is_active ? (
                            <button
                              type="button"
                              className={cx(a.action, a.actionDanger)}
                              onClick={() => setToHide(row.id)}
                            >
                              Скрыть
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={a.action}
                              onClick={() =>
                                updateWork(row.id, { is_active: true }, 'вернуть работу')
                              }
                            >
                              Вернуть в голосование
                            </button>
                          )}
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </section>

        {openRow && (
          <MediaViewer
            work={toWork(contest, openRow)}
            liked={false}
            canVote={false}
            onLike={noop}
            onClose={closeViewer}
          />
        )}

        {toHide && (
          <ConfirmDialog
            title="Скрыть работу?"
            text="Она пропадёт из голосования и итогов. Вернуть можно в любой момент."
            confirmLabel="Скрыть"
            onConfirm={hide}
            onCancel={() => setToHide(null)}
          />
        )}
      </>
    );
  }

  return (
    <PageLayout title="Админ-панель" subtitle={`Сезон ${festiveYear()}`}>
      {content}
    </PageLayout>
  );
};

export default Admin;
