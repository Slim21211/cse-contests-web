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
  selectClass,
} from '../../components/contestForm/fields';
import { useSubmitWork } from '../../components/contestForm/useSubmitWork';
import { readFormMemory, saveFormMemory } from '../../components/contestForm/formMemory';
import { focusFirst } from '../../components/contestForm/focusFirst';
import { AGE_OPTIONS } from '../../utils/age';

const Child = () => {
  const { user } = useCurrentUser();
  useEnsureVkSession(user); // продлеваем вход через VK сразу, а не в момент отправки
  const { settings } = useSiteSettings();
  const work = useSubmitWork('child', user?.id);

  const [memory] = useState(readFormMemory);
  const [fullName, setFullName] = useState(memory.fullName ?? '');
  const [department, setDepartment] = useState(memory.department ?? '');
  const [city, setCity] = useState(memory.city ?? '');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState(''); // '' — не выбран, '0' — менее 1 года
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [sent, setSent] = useState(0);

  if (isSubmissionClosed(settings)) {
    return (
      <ContestFormPage contest="child">
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
      setChildName('');
      setChildAge('');
      setTitle('');
      setFile(null);
      setAttempted(false);
      work.reset();
    };
    return (
      <ContestFormPage contest="child">
        <SubmissionSuccess onSubmitAnother={submitAnother} />
      </ContestFormPage>
    );
  }

  const fields = [
    { id: 'fullName', label: 'ФИО', ok: !!fullName.trim() },
    { id: 'department', label: 'подразделение', ok: !!department.trim() },
    { id: 'city', label: 'город', ok: !!city.trim() },
    { id: 'childName', label: 'имя ребёнка', ok: !!childName.trim() },
    { id: 'childAge', label: 'возраст', ok: childAge !== '' },
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
        child_name: childName.trim(),
        child_age: Number(childAge),
        title: title.trim(),
      })
      .then(() => setSent((n) => n + 1));
  };

  const busy = work.loading;

  return (
    <ContestFormPage contest="child" userId={user.id} withAside refreshKey={sent}>
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

        <Group title="Ребёнок">
          <Row narrowLast>
            <Field id="childName" label="Имя" invalid={invalid('childName')}>
              <input
                id="childName"
                className={inputClass}
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="Маша"
                autoComplete="off"
                required
                disabled={busy}
              />
            </Field>
            <Field id="childAge" label="Возраст" invalid={invalid('childAge')}>
              <select
                id="childAge"
                className={selectClass}
                value={childAge}
                onChange={(e) => setChildAge(e.target.value)}
                required
                disabled={busy}
              >
                <option value="" disabled>
                  Выберите
                </option>
                {AGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
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
              placeholder="Зимняя сказка"
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

export default Child;
