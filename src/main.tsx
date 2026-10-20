import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const root = createRoot(document.getElementById('root')!);

const missingEnv = [
  !import.meta.env.VITE_SUPABASE_URL && 'VITE_SUPABASE_URL',
  !import.meta.env.VITE_SUPABASE_ANON_KEY && 'VITE_SUPABASE_ANON_KEY',
].filter(Boolean) as string[];

const renderError = (title: string, details: string) =>
  root.render(
    <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      <h2>{title}</h2>
      <pre style={{ whiteSpace: 'pre-wrap', color: '#666' }}>{details}</pre>
    </div>
  );

if (missingEnv.length > 0) {
  // Без переменных Supabase приложение не работает — показываем причину вместо белого экрана.
  renderError(
    'Приложение не настроено',
    `Не заданы переменные окружения: ${missingEnv.join(', ')}.\n\n` +
      'Локально: создайте .env по образцу .env.example и перезапустите `npm run dev`.\n' +
      'GitHub Pages: проверьте секреты репозитория (Settings → Secrets and variables → Actions).'
  );
} else {
  // Страницы грузятся только после проверки env: supabase-клиент создаётся при импорте.
  import('./Root.tsx')
    .then(({ default: Root }) =>
      root.render(
        <StrictMode>
          <Root />
        </StrictMode>
      )
    )
    .catch((err) => renderError('Ошибка запуска', String(err?.message ?? err)));
}
