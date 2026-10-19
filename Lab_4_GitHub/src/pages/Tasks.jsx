import { useState } from "react";
import { Link } from "react-router-dom";
import TaskTable from "../components/TaskTable";
import { statuses } from "../utils";

export default function Tasks({ data, ...actions }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [platformId, setPlatformId] = useState("");
  const tasks = data.tasks
    .filter(
      (t) =>
        t.title
          .toLocaleLowerCase("uk")
          .includes(search.toLocaleLowerCase("uk")) &&
        (!status || t.status === status) &&
        (!platformId || t.platformId === platformId),
    )
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ПЛАНУВАННЯ</p>
          <h1>Завдання</h1>
          <p>Розклад і стани всіх місій роботизованих платформ.</p>
        </div>
        <Link className="button" to="/tasks/new">
          ＋ Нове завдання
        </Link>
      </div>
      <section className="panel">
        <div className="filters">
          <label>
            Пошук
            <input
              type="search"
              placeholder="Назва завдання…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            Статус
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Усі статуси</option>
              {Object.entries(statuses).map(([id, text]) => (
                <option key={id} value={id}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <label>
            Платформа
            <select
              value={platformId}
              onChange={(e) => setPlatformId(e.target.value)}
            >
              <option value="">Усі платформи</option>
              {data.platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <span className="result-count">Знайдено: {tasks.length}</span>
        </div>
        <TaskTable tasks={tasks} platforms={data.platforms} {...actions} />
      </section>
    </>
  );
}
