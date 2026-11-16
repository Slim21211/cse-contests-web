import { formatAge } from '../../utils/age';
import type { ContestType } from '../../contests';
import type {
  ChildContestSubmission,
  TeamContestSubmission,
  IndividualContestSubmission,
} from '../../types/database';

export type Submission =
  | ChildContestSubmission
  | TeamContestSubmission
  | IndividualContestSubmission;

interface Props {
  contest: ContestType;
  work: Submission;
  /** Подразделение видят только админы (база отдаёт его только им). */
  showDepartment?: boolean;
}

/** Название и авторы работы — карточки в админке и на странице итогов. */
const SubmissionInfo = ({ contest, work, showDepartment }: Props) => {
  const department = showDepartment && (
    <p>
      <strong>Подразделение:</strong> {work.department}
    </p>
  );
  const city = (
    <p>
      <strong>Город:</strong> {work.city}
    </p>
  );

  if (contest === 'child') {
    const child = work as ChildContestSubmission;
    return (
      <>
        <h3>{child.title}</h3>
        <p>
          <strong>Автор:</strong> {child.child_name}, {formatAge(child.child_age)}
        </p>
        <p>
          <strong>Родитель:</strong> {child.full_name}
        </p>
        {department}
        {city}
      </>
    );
  }
  if (contest === 'team') {
    const team = work as TeamContestSubmission;
    return (
      <>
        <h3>{team.team_name}</h3>
        <p>
          <strong>Участники:</strong> {team.participants}
        </p>
        {department}
        {city}
      </>
    );
  }
  const individual = work as IndividualContestSubmission;
  return (
    <>
      <h3>{individual.title}</h3>
      <p>
        <strong>Автор:</strong> {individual.full_name}
      </p>
      {department}
      {city}
    </>
  );
};

export default SubmissionInfo;
