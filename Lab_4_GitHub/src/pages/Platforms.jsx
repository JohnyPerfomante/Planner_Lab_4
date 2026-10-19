export default function Platforms({ platforms, tasks }) {
  const labels = {
    online: 'Доступна',
    charging: 'Заряджання',
    maintenance: 'Обслуговування',
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ПАРК РОБОТІВ</p>
          <h1>Платформи</h1>
          <p>Доступність і характеристики навчального парку.</p>
        </div>
        <span className="subtle-label">{platforms.length} платформи</span>
      </div>
      <div className="platform-grid">
        {platforms.map((p, i) => (
          <section className="panel platform-card" key={p.id}>
            <div className="platform-top">
              <span className="robot-symbol" aria-hidden="true">
                R{i + 1}
              </span>
              <span className={`badge ${p.status}`}>{labels[p.status]}</span>
            </div>
            <h2>{p.name}</h2>
            <p>{p.type}</p>
            <div className="platform-detail">
              <span>Робоча зона</span>
              <strong>{p.zone}</strong>
            </div>
            <div className="platform-detail">
              <span>Активні завдання</span>
              <strong>
                {
                  tasks.filter(
                    (t) =>
                      t.platformId === p.id &&
                      ['planned', 'running'].includes(t.status),
                  ).length
                }
              </strong>
            </div>
            <div className="platform-detail">
              <span>Заряд акумулятора</span>
              <strong>{p.battery}%</strong>
            </div>
            <progress
              max="100"
              value={p.battery}
              aria-label={`Заряд ${p.name}`}
            />
          </section>
        ))}
      </div>
      <p className="simulation-note">
        Показники платформ є демонстраційними. Дані завантажуються асинхронно з
        REST API.
      </p>
    </>
  );
}
