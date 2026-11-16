import { formatAge } from '../../utils/age';
import { kindOf } from '../../utils/workKind';
import type { ContestType } from '../../contests';
import type {
  ChildContestSubmission,
  TeamContestSubmission,
  IndividualContestSubmission,
} from '../../types/database';
import type { Work } from './types';

export type Row = ChildContestSubmission | TeamContestSubmission | IndividualContestSubmission;

/** Подписи карточки для каждого конкурса. */
export const toWork = (contest: ContestType, row: Row): Work => {
  const base = {
    id: row.id,
    url: row.file_url,
    posterUrl: row.poster_url,
    rotation: row.rotation ?? 0,
    kind: kindOf(row.file_url),
    isMine: row.is_mine === true,
  };
  if (contest === 'child') {
    const r = row as ChildContestSubmission;
    return { ...base, title: r.title, subtitle: `${r.child_name.trim()}, ${formatAge(r.child_age)}` };
  }
  if (contest === 'team') {
    const r = row as TeamContestSubmission;
    return { ...base, title: r.team_name.trim(), subtitle: r.city.trim() };
  }
  const r = row as IndividualContestSubmission;
  return { ...base, title: r.title, subtitle: [r.full_name, r.city].map((x) => x?.trim()).filter(Boolean).join(' · ') };
};

