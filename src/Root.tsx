import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminGate } from './auth';

import App from './App.tsx';

// Формы подачи заявок
import ChildForm from './pages/forms/child.tsx';
import TeamForm from './pages/forms/team.tsx';
import IndividualForm from './pages/forms/individual.tsx';

// Голосование
import ChildVoting from './pages/voting/child.tsx';
import TeamVoting from './pages/voting/team.tsx';
import IndividualVoting from './pages/voting/individual.tsx';

// Админка
import Admin from './pages/admin/admin.tsx';
import Results from './pages/results/results.tsx';

// Всё, кроме результатов и адреса возврата VK, закрыто AdminGate (работает при VITE_ADMIN_ONLY=true)
const gated = (el: ReactNode) => <AdminGate>{el}</AdminGate>;

const Root = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={gated(<App />)} />

      {/* Формы подачи заявок */}
      <Route path="/child-form" element={gated(<ChildForm />)} />
      <Route path="/team-form" element={gated(<TeamForm />)} />
      <Route path="/individual-form" element={gated(<IndividualForm />)} />

      {/* Голосование */}
      <Route path="/vote/child" element={gated(<ChildVoting />)} />
      <Route path="/vote/team" element={gated(<TeamVoting />)} />
      <Route path="/vote/individual" element={gated(<IndividualVoting />)} />

      {/* Админка */}
      <Route path="/admin" element={gated(<Admin />)} />

      {/* Результаты — открыты всем */}
      <Route path="/results" element={<Results />} />

      {/* Адрес возврата VK ID (VITE_VK_REDIRECT_URL): SDK сам закрывает окно входа */}
      <Route path="/auth/vk" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default Root;
