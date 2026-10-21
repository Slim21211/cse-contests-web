import { useState, type FormEvent } from 'react';
import { useCurrentUser, AuthRequired, useEnsureVkSession } from '../../auth';
import { useSiteSettings, isSubmissionClosed } from '../../settings/siteSettings';
import ContestFormPage from '../../components/contestForm/ContestFormPage';
import FileDrop from '../../components/contestForm/FileDrop';
import SubmitArea from '../../components/contestForm/SubmitArea';
import { SubmissionClosed, SubmissionSuccess } from '../../components/contestForm/Notice';
import {
  Field,
  Group,
  Row,
  formClass,
  inputClass,
  textareaClass,
} from '../../components/contestForm/fields';
import { useSubmitWork } from '../../components/contestForm/useSubmitWork';
import { readFormMemory, saveFormMemory } from '../../components/contestForm/formMemory';
import { focusFirst } from '../../components/contestForm/focusFirst';

const Team = () => {
  const { user } = useCurrentUser();
  useEnsureVkSession(user); // продлеваем вход через VK сразу, а не в момент отправки
  const { settings } = useSiteSettings();
  const work = useSubmitWork('team', user?.id);

  const [memory] = useState(readFormMemory);
  const [teamName, setTeamName] = useState(memory.teamName ?? '');
  const [department, setDepartment] = useState(memory.department ?? '');
  const [city, setCity] = useState(memory.city ?? '');
  const [participants, setParticipants] = useState(memory.participants ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [sent, setSent] = useState(0);

  if (isSubmissionClosed(settings)) {
    return (
      <ContestFormPage contest="team">
        <SubmissionClosed />
      </ContestFormPage>
    );
  }

  // Загрузка файла проверяет VK-токен на сервере — без входа форму не показываем.
  if (!user) {
    return <AuthRequired showBackLink message="Войдите, чтобы отправить работу на конкурс." />;
  }

  if (work.success) {
    const submitAnother = () => {
      setFile(null);
      setAttempted(false);
      work.reset();
    };
    return (
      <ContestFormPage contest="team">
        <SubmissionSuccess onSubmitAnother={submitAnother} />
      </ContestFormPage>
    );
  }

  const fields = [
    { id: 'teamName', label: 'название команды', ok: !!teamName.trim() },
    { id: 'department', label: 'подразделение', ok: !!department.trim() },
    { id: 'city', label: 'город', ok: !!city.trim() },
    { id: 'participants', label: 'участники', ok: !!participants.trim() },
    { id: 'file', label: 'файл', ok: !!file },
  ];
  const missing = fields.filter((f) => !f.ok);
  const invalid = (id: string) => attempted && missing.some((f) => f.id === id);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (missing.length || !file) {
      focusFirst(missing.map((f) => f.id));
      return;
    }
    const row = {
      team_name: teamName.trim(),
      department: department.trim(),
      city: city.trim(),
      participants: participants.trim(),
    };
    saveFormMemory({
      teamName: row.team_name,
      department: row.department,
      city: row.city,
      participants: row.participants,
    });
    void work.submit(file, row).then(() => setSent((n) => n + 1));
  };

  const busy = work.loading;

  return (
    <ContestFormPage contest="team" userId={user.id} withAside refreshKey={sent}>
      <form className={formClass} onSubmit={onSubmit} noValidate aria-busy={busy}>
        <Group title="Команда">
          <Field id="teamName" label="Название команды" invalid={invalid('teamName')}>
            <input
              id="teamName"
              className={inputClass}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Новогодние Эльфы"
              autoComplete="off"
              required
              disabled={busy}
            />
          </Field>
          <Row>
            <Field id="department" label="Подразделение" invalid={invalid('department')}>
              <input
                id="department"
                className={inputClass}
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Отдел обучения и развития"
                autoComplete="organization-title"
                required
                disabled={busy}
              />
            </Field>
            <Field id="city" label="Город" invalid={invalid('city')}>
              <input
                id="city"
                className={inputClass}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Москва"
                autoComplete="address-level2"
                required
                disabled={busy}
              />
            </Field>
          </Row>
          <Field id="participants" label="Участники" invalid={invalid('participants')}>
            <textarea
              id="participants"
              className={textareaClass}
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="Иванов И. И., Петров П. П., Сидоров С. С."
              rows={3}
              required
              disabled={busy}
            />
          </Field>
        </Group>

        <Group title="Работа">
          <Field id="file" label="Файл" invalid={invalid('file')}>
            <FileDrop
              id="file"
              file={file}
              onChange={setFile}
              disabled={busy}
              invalid={invalid('file')}
            />
          </Field>
        </Group>

        <SubmitArea
          loading={busy}
          progress={work.progress}
          retrying={work.retrying}
          fileSize={file?.size}
          error={work.error?.user}
          missing={attempted ? missing.map((f) => f.label) : []}
        />
      </form>
    </ContestFormPage>
  );
};

export default Team;
