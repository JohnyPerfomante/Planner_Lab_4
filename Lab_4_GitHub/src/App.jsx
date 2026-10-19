import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { api } from './api';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskForm from './pages/TaskForm';
import Platforms from './pages/Platforms';

function Workspace() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const reading = useRef(null);
  const mounted = useRef(false);
  const location = useLocation();
  const refresh = useCallback(async () => {
    const job = (reading.current || Promise.resolve()).then(async () => {
      try {
        const next = await api.state();
        if (mounted.current) {
          setData(next);
          setConnected(true);
          setError('');
          setLastUpdate(new Date());
        }
      } catch (err) {
        if (mounted.current) {
          setConnected(false);
          setError(err.message);
        }
      }
    });
    reading.current = job;
    await job;
    if (reading.current === job) reading.current = null;
  }, []);
  useEffect(() => {
    mounted.current = true;
    refresh();
    const timer = setInterval(() => {
      if (!reading.current) refresh();
    }, 5000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    setMessage(location.state?.message || '');
  }, [location]);
  async function mutate(action, text) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      await refresh();
      setMessage(text);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const actions = {
    busy: busy || !connected,
    onChange: (id, status) =>
      mutate(() => api.update(id, status), 'Стан завдання оновлено.'),
    onDelete: (id) => mutate(() => api.remove(id), 'Завдання видалено.'),
  };
  return (
    <div className="app-shell">
      <Navigation connected={connected} />
      <div className="workspace">
        <header className="topbar">
          <span>
            Роботизовані платформи{' '}
            <span className="breadcrumb">/ Робочий простір</span>
          </span>
          <div>
            <span className="sync-time">
              {lastUpdate
                ? `Оновлено ${lastUpdate.toLocaleTimeString('uk-UA')}`
                : 'Підключення…'}
            </span>
            <button
              className="refresh-button"
              onClick={refresh}
              disabled={busy}
            >
              ↻ Оновити
            </button>
            <span className="avatar" aria-label="Оператор">
              ОП
            </span>
          </div>
        </header>
        <main id="main-content">
          {error && (
            <div className="error-message" role="alert">
              {error}{' '}
              <button className="text-button" onClick={refresh}>
                Повторити запит
              </button>
            </div>
          )}
          {message && (
            <div className="success-message" role="status">
              {message}
            </div>
          )}
          {!data ? (
            <div className="loading" role="status">
              {error
                ? 'Очікування з’єднання з сервером'
                : 'Завантаження даних з API…'}
            </div>
          ) : (
            <Routes>
              <Route
                path="/"
                element={<Dashboard data={data} {...actions} />}
              />
              <Route
                path="/tasks"
                element={<Tasks data={data} {...actions} />}
              />
              <Route
                path="/tasks/new"
                element={
                  <TaskForm
                    platforms={data.platforms}
                    tasks={data.tasks}
                    onSaved={refresh}
                    connected={connected}
                  />
                }
              />
              <Route
                path="/platforms"
                element={
                  <Platforms platforms={data.platforms} tasks={data.tasks} />
                }
              />
              <Route
                path="*"
                element={
                  <div className="empty">
                    <h1>Сторінку не знайдено</h1>
                    <Link to="/">Повернутися до огляду</Link>
                  </div>
                }
              />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Workspace />
    </BrowserRouter>
  );
}
