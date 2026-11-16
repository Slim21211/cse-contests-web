import { CONTESTS, type ContestType } from '../../contests';
import { cx } from '../../utils/cx';
import s from './contestTabs.module.scss';

const LABELS: Record<ContestType, string> = {
  child: 'Детский',
  team: 'Командный',
  individual: 'Индивидуальный',
};

interface Props {
  value: ContestType;
  onChange: (contest: ContestType) => void;
}

/** Переключатель конкурсов — как вкладки на главной. */
const ContestTabs = ({ value, onChange }: Props) => (
  <div className={s.tabs} role="tablist" aria-label="Конкурс">
    {CONTESTS.map((c) => (
      <button
        key={c}
        type="button"
        role="tab"
        aria-selected={value === c}
        className={cx(s.tab, value === c && s.tabActive)}
        onClick={() => onChange(c)}
      >
        {LABELS[c]}
      </button>
    ))}
  </div>
);

export default ContestTabs;
