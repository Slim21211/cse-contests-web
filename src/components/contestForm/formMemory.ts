// Данные сотрудника и команды запоминаем в браузере: следующая заявка
// открывается уже заполненной. Ничего не уходит на сервер, кроме самой заявки.

const STORAGE_KEY = 'cse-form-memory';

export interface FormMemory {
  fullName?: string;
  department?: string;
  city?: string;
  teamName?: string;
  participants?: string;
}

export const readFormMemory = (): FormMemory => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as FormMemory;
  } catch {
    return {};
  }
};

export const saveFormMemory = (patch: FormMemory) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readFormMemory(), ...patch }));
  } catch {
    /* приватный режим и т. п. — просто не запоминаем */
  }
};
