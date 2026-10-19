const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("HTTP API створює, перевіряє, зберігає та видаляє завдання", async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "robot-api-"));
  const dataFile = path.join(temp, "state.json");
  let child;
  let base;
  async function start() {
    child = spawn(process.execPath, [path.join(__dirname, "index.cjs")], {
      env: { ...process.env, PORT: "0", DATA_FILE: dataFile },
      stdio: ["ignore", "pipe", "pipe"],
    });
    // PORT=0 для тесту потребує фактичної адреси з server.address().
    const line = await new Promise((resolve, reject) => {
      child.stdout.once("data", (data) => resolve(data.toString()));
      child.once("error", reject);
      child.once("exit", (code) => reject(new Error(`Server exited ${code}`)));
    });
    base = line.trim().split(" ").at(-1);
  }
  async function stop() {
    if (!child || child.exitCode !== null) return;
    const ended = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGTERM");
    await ended;
  }
  async function call(url, method = "GET", data) {
    return fetch(base + "/api" + url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  }
  try {
    await start();
    const initial = await (await call("/state")).json();
    assert.equal(initial.platforms.length, 4);
    const input = {
      title: "Інтеграційна місія",
      description: "",
      platformId: "nova",
      startAt: new Date(Date.now() + 300 * 60000).toISOString(),
      duration: 15,
      priority: "high",
    };
    const responses = await Promise.all([
      call("/tasks", "POST", input),
      call("/tasks", "POST", input),
    ]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
    const task = await responses.find((r) => r.status === 201).json();
    assert.equal(
      (await call(`/tasks/${task.id}`, "PATCH", { status: "running" })).status,
      409,
    );
    await stop();
    await start();
    const restored = await (await call("/tasks")).json();
    assert.ok(restored.some((t) => t.id === task.id));
    assert.equal(
      (await call(`/tasks/${task.id}`, "PATCH", { status: "cancelled" }))
        .status,
      200,
    );
    assert.equal((await call(`/tasks/${task.id}`, "DELETE")).status, 204);
    assert.equal((await call(`/tasks/${task.id}`, "DELETE")).status, 404);
    assert.equal((await call("/tasks", "POST", null)).status, 400);
    const badJson = await fetch(base + "/api/tasks", {
      method: "POST",
      body: "{broken",
    });
    assert.equal(badJson.status, 400);
  } finally {
    await stop();
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
