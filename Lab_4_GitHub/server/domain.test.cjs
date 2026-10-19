const { test } = require("node:test");
const assert = require("node:assert/strict");
const { seedState, validateTask, transition } = require("./domain.cjs");
const now = Date.parse("2026-10-18T12:00:00Z");
const valid = (minutes = 200) => ({
  title: "  Тестова місія  ",
  description: "",
  platformId: "nova",
  startAt: new Date(now + minutes * 60000).toISOString(),
  duration: 30,
  priority: "normal",
});

test("Коректне завдання нормалізується та отримує UUID", () => {
  const task = validateTask(valid(), seedState(now), now);
  assert.equal(task.title, "Тестова місія");
  assert.equal(task.status, "planned");
  assert.match(task.id, /^[a-f0-9-]{36}$/);
});
test("Порожні назви, минулий час і некоректна тривалість відхиляються", () => {
  for (const patch of [
    { title: "   " },
    { duration: 0 },
    { duration: 30.5 },
    { duration: 481 },
    { priority: "urgent" },
    { platformId: "unknown" },
    { startAt: "bad" },
    { startAt: new Date(now - 60000).toISOString() },
    { description: "а".repeat(501) },
  ]) {
    assert.throws(
      () => validateTask({ ...valid(), ...patch }, seedState(now), now),
      (error) => error.status === 422,
    );
  }
});
test("Конфлікти на початку, всередині та навколо місії відхиляються", () => {
  for (const [minutes, duration] of [
    [50, 20],
    [60, 5],
    [70, 10],
    [55, 50],
  ]) {
    assert.throws(
      () => validateTask({ ...valid(minutes), duration }, seedState(now), now),
      (error) => error.status === 409,
    );
  }
});
test("Суміжні проміжки та різні платформи дозволені", () => {
  assert.equal(validateTask(valid(90), seedState(now), now).status, "planned");
  assert.equal(
    validateTask({ ...valid(30), duration: 30 }, seedState(now), now).status,
    "planned",
  );
  assert.equal(
    validateTask({ ...valid(60), platformId: "atlas" }, seedState(now), now)
      .status,
    "planned",
  );
});
test("Заряджання та обслуговування блокують планування", () => {
  for (const platformId of ["vector", "orion"])
    assert.throws(
      () => validateTask({ ...valid(), platformId }, seedState(now), now),
      (error) => error.status === 409,
    );
});
test("Завершені та скасовані місії не займають розклад", () => {
  const state = seedState(now);
  state.tasks.find((t) => t.id === "demo-2").status = "cancelled";
  assert.equal(validateTask(valid(60), state, now).status, "planned");
});
test("Стани змінюються лише дозволеними переходами", () => {
  const state = seedState(now);
  const running = state.tasks[0];
  assert.equal(
    transition(running, "completed", state, now).status,
    "completed",
  );
  assert.equal(
    transition(running, "cancelled", state, now).status,
    "cancelled",
  );
  assert.throws(
    () => transition(running, "planned", state, now),
    (error) => error.status === 409,
  );
  assert.throws(
    () => transition(state.tasks[3], "running", state, now),
    (error) => error.status === 409,
  );
});
test("Передчасний, прострочений та одночасний запуск заборонені", () => {
  const state = seedState(now);
  const task = state.tasks[1];
  assert.throws(
    () => transition(task, "running", state, now),
    (error) => error.status === 409,
  );
  assert.throws(
    () => transition(task, "running", state, now + 100 * 60000),
    (error) => error.status === 409,
  );
  assert.equal(
    transition(task, "running", state, now + 61 * 60000).status,
    "running",
  );
  state.tasks.push({ ...task, id: "other", status: "running" });
  assert.throws(
    () => transition(task, "running", state, now + 61 * 60000),
    (error) => error.status === 409,
  );
});
