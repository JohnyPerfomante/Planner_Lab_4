import { Link, NavLink } from "react-router-dom";

export default function Navigation({ connected }) {
  return (
    <aside className="sidebar">
      <Link className="brand" to="/" aria-label="Robot Planner — головна">
        <span className="brand-icon">R</span>
        <span>
          Robot Planner<small>ПЛАНУВАННЯ МІСІЙ</small>
        </span>
      </Link>
      <p className="nav-label">РОБОЧИЙ ПРОСТІР</p>
      <nav aria-label="Головна навігація">
        <NavLink to="/" end>
          <span aria-hidden="true">▦</span>Огляд
        </NavLink>
        <NavLink to="/tasks" end>
          <span aria-hidden="true">☷</span>Завдання
        </NavLink>
        <NavLink to="/platforms">
          <span aria-hidden="true">◇</span>Платформи
        </NavLink>
        <NavLink to="/tasks/new">
          <span aria-hidden="true">＋</span>Нове завдання
        </NavLink>
      </nav>
      <div className="sidebar-bottom">
        <span className={`connection-dot ${connected ? "" : "offline"}`} />
        {connected ? "API підключено" : "API недоступне"}
        <small>Практична робота 4 · Варіант 6</small>
      </div>
    </aside>
  );
}
