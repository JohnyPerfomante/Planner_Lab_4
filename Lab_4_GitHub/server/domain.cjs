const { randomUUID } = require("node:crypto");

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function seedState(now = Date.now()) {
  const at = (minutes) => new Date(now + minutes * 60000).toISOString();
  return {
    platforms: [
      {
        id: "atlas",
        name: "Atlas 01",
        type: "Мобільна платформа",
        zone: "Склад А",
        battery: 86,
        status: "online",
      },
      {
        id: "nova",
        name: "Nova 02",
        type: "Інспекційний робот",
        zone: "Корпус Б",
        battery: 72,
        status: "online",
      },
      {
        id: "vector",
        name: "Vector 03",
        type: "Транспортна платформа",
        zone: "Док 3",
        battery: 31,
        status: "charging",
      },
      {
        id: "orion",
        name: "Orion 04",
        type: "Робот маніпулятор",
        zone: "Лінія 2",
        battery: 94,
        status: "maintenance",
      },
    ],
    tasks: [
      {
        id: "demo-1",
        title: "Доставка комплектувальних",
        description: "Перевезти контейнер до станції збирання.",
        platformId: "atlas",
        startAt: at(-10),
        duration: 35,
        priority: "high",
        status: "running",
        createdAt: at(-60),
      },
      {
        id: "demo-2",
        title: "Інспекція корпусу Б",
        description: "Оглянути контрольні точки та перевірити датчики.",
        platformId: "nova",
        startAt: at(60),
        duration: 30,
        priority: "normal",
        status: "planned",
        createdAt: at(-50),
      },
      {
        id: "demo-3",
        title: "Переміщення вантажу",
        description: "Доставити палету до зони відвантаження.",
        platformId: "atlas",
        startAt: at(120),
        duration: 45,
        priority: "normal",
        status: "planned",
        createdAt: at(-40),
      },
      {
        id: "demo-4",
        title: "Перевірка навігації",
        description: "Контрольний проїзд за маршрутом.",
        platformId: "nova",
        startAt: at(-120),
        duration: 20,
        priority: "low",
        status: "completed",
        createdAt: at(-180),
      },
    ],
    events: [
      {
        id: randomUUID(),
        at: at(0),
        text: "Демонстраційний набір даних завантажено",
      },
    ],
  };
}

const active = (task) => ["planned", "running"].includes(task.status);
const endAt = (task) => Date.parse(task.startAt) + task.duration * 60000;

function validateTask(input, state, now = Date.now()) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new ApiError(400, "Очікується JSON об’єкт.");
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  if (title.length < 3 || title.length > 100)
    throw new ApiError(422, "Назва має містити від 3 до 100 символів.");
  if (description.length > 500)
    throw new ApiError(422, "Опис не може перевищувати 500 символів.");
  const platform = state.platforms.find((p) => p.id === input.platformId);
  if (!platform) throw new ApiError(422, "Оберіть наявну платформу.");
  if (platform.status !== "online")
    throw new ApiError(409, "Платформа зараз недоступна для планування.");
  const start =
    typeof input.startAt === "string" ? Date.parse(input.startAt) : NaN;
  if (!Number.isFinite(start) || start < now)
    throw new ApiError(422, "Оберіть час початку в майбутньому.");
  if (
    !Number.isInteger(input.duration) ||
    input.duration < 5 ||
    input.duration > 480
  )
    throw new ApiError(
      422,
      "Тривалість має бути цілим числом від 5 до 480 хвилин.",
    );
  if (!["low", "normal", "high"].includes(input.priority))
    throw new ApiError(422, "Некоректний пріоритет.");
  const end = start + input.duration * 60000;
  const conflict = state.tasks.some(
    (t) =>
      t.platformId === platform.id &&
      active(t) &&
      start < endAt(t) &&
      end > Date.parse(t.startAt),
  );
  if (conflict)
    throw new ApiError(
      409,
      "Платформа вже має завдання в цей час. Оберіть інший проміжок.",
    );
  return {
    id: randomUUID(),
    title,
    description,
    platformId: platform.id,
    startAt: new Date(start).toISOString(),
    duration: input.duration,
    priority: input.priority,
    status: "planned",
    createdAt: new Date(now).toISOString(),
  };
}

function transition(task, status, state, now = Date.now()) {
  const allowed = {
    planned: ["running", "cancelled"],
    running: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };
  if (!allowed[task.status]?.includes(status))
    throw new ApiError(409, "Ця зміна стану завдання заборонена.");
  if (status === "running") {
    const platform = state.platforms.find((p) => p.id === task.platformId);
    if (platform.status !== "online")
      throw new ApiError(409, "Платформа недоступна.");
    if (Date.parse(task.startAt) > now)
      throw new ApiError(
        409,
        "Запуск можливий після запланованого часу початку.",
      );
    if (endAt(task) <= now)
      throw new ApiError(
        409,
        "Запланований проміжок минув. Створіть нове завдання.",
      );
    if (
      state.tasks.some(
        (t) =>
          t.id !== task.id &&
          t.platformId === task.platformId &&
          t.status === "running",
      )
    )
      throw new ApiError(409, "Платформа вже виконує інше завдання.");
  }
  return { ...task, status, updatedAt: new Date(now).toISOString() };
}

module.exports = { ApiError, seedState, validateTask, transition };
