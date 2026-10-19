import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { dateTime, localInput } from '../utils';

export default function TaskForm({ platforms, tasks, onSaved, connected }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    platformId: '',
    startAt: localInput(Date.now() + 3600000),
    duration: 30,
    priority: 'normal',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const update = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    setError('');
  };
  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    const title = form.title.trim();
    if (title.length < 3 || title.length > 100)
      return setError('Назва має містити від 3 до 100 символів.');
    if (!form.platformId) return setError('Оберіть платформу.');
    const start = new Date(form.startAt).getTime();
    if (!Number.isFinite(start) || start <= Date.now())
      return setError('Оберіть час початку в майбутньому.');
    const duration = Number(form.duration);
    if (!Number.isInteger(duration) || duration < 5 || duration > 480)
      return setError('Тривалість має бути цілим числом від 5 до 480 хвилин.');
    setSaving(true);
    setError('');
    try {
      await api.create({
        ...form,
        title,
        duration,
        startAt: new Date(start).toISOString(),
      });
      await onSaved();
      navigate('/tasks', {
        state: { message: 'Завдання успішно заплановано.' },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  const reserved = tasks
    .filter(
      (t) =>
        t.platformId === form.platformId &&
        ['planned', 'running'].includes(t.status),
    )
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">НОВА МІСІЯ</p>
          <h1>Запланувати завдання</h1>
          <p>Оберіть платформу, час виконання та пріоритет.</p>
        </div>
      </div>
      <div className="form-layout">
        <form
          className="panel task-form"
          onSubmit={submit}
          noValidate
          aria-busy={saving}
        >
          <h2>Параметри завдання</h2>
          <label htmlFor="title">
            Назва завдання <span>*</span>
          </label>
          <input
            id="title"
            name="title"
            value={form.title}
            onChange={update}
            maxLength={100}
            placeholder="Наприклад, інспекція складської зони"
            required
            aria-describedby={error ? 'form-error' : undefined}
          />
          <div className="form-row">
            <div>
              <label htmlFor="platformId">
                Платформа <span>*</span>
              </label>
              <select
                id="platformId"
                name="platformId"
                value={form.platformId}
                onChange={update}
                required
              >
                <option value="">Оберіть платформу</option>
                {platforms.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={p.status !== 'online'}
                  >
                    {p.name}
                    {p.status !== 'online' ? ' · недоступна' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="priority">Пріоритет</label>
              <select
                id="priority"
                name="priority"
                value={form.priority}
                onChange={update}
              >
                <option value="low">Низький</option>
                <option value="normal">Звичайний</option>
                <option value="high">Високий</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div>
              <label htmlFor="startAt">
                Початок <span>*</span>
              </label>
              <input
                id="startAt"
                type="datetime-local"
                name="startAt"
                value={form.startAt}
                onChange={update}
                required
              />
              <small>Місцевий час браузера</small>
            </div>
            <div>
              <label htmlFor="duration">
                Тривалість у хвилинах <span>*</span>
              </label>
              <input
                id="duration"
                type="number"
                name="duration"
                min="5"
                max="480"
                step="1"
                value={form.duration}
                onChange={update}
                required
              />
              <small>Від 5 до 480 хвилин</small>
            </div>
          </div>
          <label htmlFor="description">Опис місії</label>
          <textarea
            id="description"
            name="description"
            rows="3"
            maxLength={500}
            value={form.description}
            onChange={update}
            placeholder="Маршрут, контрольні точки або інструкції для оператора"
          />
          {error && (
            <p id="form-error" className="error-message" role="alert">
              {error}
            </p>
          )}
          <div className="form-footer">
            <Link className="secondary-button" to="/tasks">
              До списку
            </Link>
            <button
              className="button"
              type="submit"
              disabled={saving || !connected}
            >
              {saving ? 'Збереження…' : 'Запланувати завдання'}
            </button>
          </div>
        </form>
        <aside className="form-help">
          <p className="eyebrow">ПЕРЕВІРКА РОЗКЛАДУ</p>
          <h2>
            Одна платформа
            <br />
            Одна місія
          </h2>
          <p>
            Сервер перевіряє перетин часових проміжків перед збереженням.
            Платформи на заряджанні або обслуговуванні недоступні.
          </p>
          <h3>Зайняті проміжки</h3>
          {form.platformId ? (
            reserved.length ? (
              <ul>
                {reserved.map((t) => (
                  <li key={t.id}>
                    <strong>{t.title}</strong>
                    <small>
                      {dateTime(t.startAt)} · {t.duration} хв
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Для цієї платформи немає активних завдань.</p>
            )
          ) : (
            <p>Оберіть платформу, щоб переглянути її розклад.</p>
          )}
          <p className="help-note">
            Запуск доступний у межах запланованого проміжку. Виконання
            підтверджує оператор.
          </p>
        </aside>
      </div>
    </>
  );
}
