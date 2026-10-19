import { Link } from 'react-router-dom';
import TaskTable from '../components/TaskTable';
import Weather from '../components/Weather';
import { dateTime } from '../utils';

export default function Dashboard({ data, ...actions }) {
  const activeTasks = data.tasks
    .filter((t) => ['planned', 'running'].includes(t.status))
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  const metrics = [
    [
      'Доступні платформи',
      data.platforms.filter((p) => p.status === 'online').length,
      `із ${data.platforms.length} у парку`,
      '◇',
    ],
    [
      'Заплановано',
      data.tasks.filter((t) => t.status === 'planned').length,
      'у черзі виконання',
      '☷',
    ],
    [
      'Виконується',
      data.tasks.filter((t) => t.status === 'running').length,
      'активних місій',
      '↗',
    ],
    [
      'Завершено',
      data.tasks.filter((t) => t.status === 'completed').length,
      'успішних місій',
      '✓',
    ],
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ЦЕНТР КЕРУВАННЯ</p>
          <h1>Огляд місій</h1>
          <p>Плануйте роботу платформ і стежте за виконанням завдань.</p>
        </div>
        <Link className="button" to="/tasks/new">
          ＋ Нове завдання
        </Link>
      </div>
      <div className="metrics">
        {metrics.map(([label, value, note, icon]) => (
          <section className="metric" key={label}>
            <span className="metric-icon" aria-hidden="true">
              {icon}
            </span>
            <p>{label}</p>
            <strong>{String(value).padStart(2, '0')}</strong>
            <small>{note}</small>
          </section>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Розклад завдань</h2>
            <p>Активні та найближчі місії</p>
          </div>
          <Link to="/tasks">Усі завдання →</Link>
        </div>
        <TaskTable
          tasks={activeTasks}
          platforms={data.platforms}
          {...actions}
        />
      </section>
      <div className="dashboard-bottom">
        <Weather />
        <section className="panel activity">
          <div className="panel-heading">
            <h2>Останні події</h2>
            <span className="live-label">LIVE</span>
          </div>
          <ul>
            {data.events.slice(0, 3).map((event) => (
              <li key={event.id}>
                <span className="event-dot" />
                <div>
                  {event.text}
                  <small>{dateTime(event.at)}</small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p className="simulation-note">
        Режим симуляції. Команди змінюють стан на REST сервері; фізичні роботи
        не підключені. Запуск і завершення місій виконує оператор.
      </p>
    </>
  );
}
