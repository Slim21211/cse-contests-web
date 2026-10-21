import { useState, type FormEvent } from 'react';
import { useCurrentUser, AuthRequired, useEnsureVkSession } from '../../auth';
import { useSiteSettings, isSubmissionClosed } from '../../settings/siteSettings';
import ContestFormPage from '../../components/contestForm/ContestFormPage';
import FileDrop from '../../components/contestForm/FileDrop';
import SubmitArea from '../../components/contestForm/SubmitArea';
import { SubmissionClosed, SubmissionSuccess } from '../../components/contestForm/Notice';
import { Field, Group, Row, formClass, inputClass } from '../../components/contestForm/fields';
import { useSubmitWork } from '../../components/contestForm/useSubmitWork';
import { readFormMemory, saveFormMemory } from '../../components/contestForm/formMemory';
import { focusFirst } from '../../components/contestForm/focusFirst';

const Individual = () => {
  const { user } = useCurrentUser();
  useEnsureVkSession(user); // продлеваем вход через VK сразу, а не в момент отправки
  const { settings } = useSiteSettings();
  const work = useSubmitWork('individual', user?.id);

  const [memory] = useState(readFormMemory);
  const [fullName, setFullName] = useState(memory.fullName ?? '');
  const [department, setDepartment] = useState(memory.department ?? '');
  const [city, setCity] = useState(memory.city ?? '');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [sent, setSent] = useState(0);

  if (isSubmissionClosed(settings)) {
    return (
      <ContestFormPage contest="individual">
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
      setTitle('');
      setFile(null);
      setAttempted(false);
      work.reset();
    };
    return (
      <ContestFormPage contest="individual">
        <SubmissionSuccess onSubmitAnother={submitAnother} />
      </ContestFormPage>
    );
  }

  const fields = [
    { id: 'fullName', label: 'ФИО', ok: !!fullName.trim() },
    { id: 'department', label: 'подразделение', ok: !!department.trim() },
    { id: 'city', label: 'город', ok: !!city.trim() },
    { id: 'title', label: 'название', ok: !!title.trim() },
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
    saveFormMemory({ fullName: fullName.trim(), department: department.trim(), city: city.trim() });
    void work
      .submit(file, {
        full_name: fullName.trim(),
        department: department.trim(),
        city: city.trim(),
        title: title.trim(),
      })
      .then(() => setSent((n) => n + 1));
  };

  const busy = work.loading;

  return (
    <ContestFormPage contest="individual" userId={user.id} withAside refreshKey={sent}>
      <form className={formClass} onSubmit={onSubmit} noValidate aria-busy={busy}>
        <Group title="Сотрудник">
          <Field id="fullName" label="ФИО" invalid={invalid('fullName')}>
            <input
              id="fullName"
              className={inputClass}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иванов Иван Иванович"
              autoComplete="name"
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
        </Group>

        <Group title="Работа">
          <Field id="title" label="Название" invalid={invalid('title')}>
            <input
              id="title"
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Снежный пейзаж"
              autoComplete="off"
              required
              disabled={busy}
            />
          </Field>
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

export default Individual;
