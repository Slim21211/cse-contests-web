import type { ReactNode } from 'react';
import { useIsAdmin, type AppUser } from '../../auth';
import { useSiteSettings, submissionStatus } from '../../settings/siteSettings';
import type { ContestType } from '../../contests';
import ContestFormPage from './ContestFormPage';
import Loader from '../loader/loader';
import { SubmissionClosed } from './Notice';

/**
 * Что показать вместо формы, если приём не идёт (иначе null).
 * Админам форма доступна всегда — база разрешает им подавать работы вне сроков.
 * Идущую загрузку и экран «отправлено» не прячем, даже если срок вышел.
 */
export const useSubmissionGate = (
  contest: ContestType,
  user: AppUser | null,
  work: { loading: boolean; success: boolean },
): ReactNode => {
  const { settings } = useSiteSettings();
  const isAdmin = useIsAdmin(user);
  const status = submissionStatus(settings);

  if (status === 'open' || work.loading || work.success || isAdmin === true) return null;
  return (
    <ContestFormPage contest={contest}>
      {user && isAdmin === null ? (
        <Loader label="Загрузка…" />
      ) : (
        <SubmissionClosed start={status === 'upcoming' ? settings.submissionStart : null} />
      )}
    </ContestFormPage>
  );
};
