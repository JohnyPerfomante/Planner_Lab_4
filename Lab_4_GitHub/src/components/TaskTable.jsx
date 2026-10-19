import { useState } from "react";
import { dateTime, statuses, priorities } from "../utils";

export default function TaskTable({
  tasks,
  platforms,
  onChange,
  onDelete,
  busy,
}) {
  const [confirmId, setConfirmId] = useState(null);
  if (!tasks.length)
    return (
      <div className="empty">
        <span>◇</span>
        <h3>Завдань поки немає</h3>
        <p>Створіть завдання або змініть фільтри.</p>
      </div>
    );
  return (
    <div className="table-wrap">
      <table className="task-table">
        <thead>
          <tr>
            <th>Завдання</th>
            <th>Платформа</th>
            <th>Початок і тривалість</th>
            <th>Статус</th>
            <th>Дії</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} data-task-id={task.id}>
              <td>
                <strong className="task-title">{task.title}</strong>
                <span className={`priority priority-${task.priority}`}>
                  {priorities[task.priority]} пріоритет
                </span>
              </td>
              <td>
                {platforms.find((p) => p.id === task.platformId)?.name ||
                  task.platformId}
              </td>
              <td className="time-cell">
                {dateTime(task.startAt)}
                <small>{task.duration} хв</small>
              </td>
              <td>
                <span className={`badge ${task.status}`}>
                  {statuses[task.status]}
                </span>
              </td>
              <td>
                <div className="task-actions">
                  {task.status === "planned" && (
                    <button
                      className="small-button"
                      disabled={busy}
                      onClick={() => onChange(task.id, "running")}
                    >
                      Запустити
                    </button>
                  )}
                  {task.status === "running" && (
                    <button
                      className="small-button"
                      disabled={busy}
                      onClick={() => onChange(task.id, "completed")}
                    >
                      Завершити
                    </button>
                  )}
                  {["planned", "running"].includes(task.status) && (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => onChange(task.id, "cancelled")}
                    >
                      Скасувати
                    </button>
                  )}
                  {task.status !== "running" &&
                    (confirmId === task.id ? (
                      <>
                        <button
                          className="text-button danger"
                          disabled={busy}
                          onClick={async () => {
                            await onDelete(task.id);
                            setConfirmId(null);
                          }}
                        >
                          Так, видалити
                        </button>
                        <button
                          className="text-button"
                          onClick={() => setConfirmId(null)}
                        >
                          Ні
                        </button>
                      </>
                    ) : (
                      <button
                        className="icon-button"
                        aria-label={`Видалити ${task.title}`}
                        disabled={busy}
                        onClick={() => setConfirmId(task.id)}
                      >
                        ×
                      </button>
                    ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
