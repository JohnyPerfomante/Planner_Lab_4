# Практична робота 4 · Варіант 6

Robot Planner — React SPA для планування завдань роботизованих платформ.
Проєкт створено через `npx create-react-app@5.1.0 robot-planner --use-npm`. Використано React Router і Fetch API.

## Запуск

Потрібні Node.js 20 або новіший і npm. У цій папці виконати:

```bash
npm ci
npm start
```

Відкрити http://127.0.0.1:3004. Команда запускає React dev server на порту
3004 та окремий API на 4004. Запити `/api/*` проходять через CRA proxy.
Зупинка обох процесів — Ctrl+C. Порти 3004 і 4004 мають бути вільними.

## Структура

```text
public/                HTML оболонка та favicon
src/App.jsx            маршрути, стан, опитування API
src/api.js             Fetch клієнт і обробка помилок
src/components/        навігація, таблиця, погодний API
src/pages/             огляд, список, форма, платформи
src/styles.css         адаптивні стилі
server/index.cjs       HTTP API, JSON сховище, видача build
server/domain.cjs      валідація, конфлікти, переходи станів
scripts/dev.cjs        запуск dev server та API
scripts/browser.cjs    браузерні сценарії перевірки
```
