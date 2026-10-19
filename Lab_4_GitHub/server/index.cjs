const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const {
  ApiError,
  seedState,
  validateTask,
  transition,
} = require("./domain.cjs");

const port = Number(process.env.PORT || 4004);
const dataFile = path.resolve(
  process.env.DATA_FILE || path.join(__dirname, "data/state.json"),
);
const buildDir = path.resolve(__dirname, "../build");
fs.mkdirSync(path.dirname(dataFile), { recursive: true });
let state = fs.existsSync(dataFile)
  ? JSON.parse(fs.readFileSync(dataFile, "utf8"))
  : seedState();

function save(next) {
  fs.writeFileSync(dataFile + ".tmp", JSON.stringify(next, null, 2));
  fs.renameSync(dataFile + ".tmp", dataFile);
  state = next;
}
if (!fs.existsSync(dataFile)) save(state);

function commit(next, text) {
  next.events = [
    { id: randomUUID(), at: new Date().toISOString(), text },
    ...next.events,
  ].slice(0, 50);
  save(next);
}

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

async function body(req) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (Buffer.byteLength(text) > 16384)
      throw new ApiError(413, "Тіло запиту завелике.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "Некоректний JSON.");
  }
}

async function api(req, res, pathname) {
  // Невелика затримка робить асинхронне очікування видимим у навчальному стенді.
  await new Promise((resolve) => setTimeout(resolve, 180));
  if (req.method === "GET" && pathname === "/api/health")
    return json(res, 200, { status: "ok", mode: "simulator" });
  if (req.method === "GET" && pathname === "/api/state")
    return json(res, 200, state);
  if (req.method === "GET" && pathname === "/api/platforms")
    return json(res, 200, state.platforms);
  if (req.method === "GET" && pathname === "/api/tasks")
    return json(res, 200, state.tasks);
  if (req.method === "POST" && pathname === "/api/tasks") {
    const input = await body(req);
    const task = validateTask(input, state);
    commit(
      { ...state, tasks: [...state.tasks, task] },
      `Заплановано: ${task.title}`,
    );
    return json(res, 201, task);
  }
  const match = pathname.match(/^\/api\/tasks\/([a-zA-Z0-9-]+)$/);
  if (match && ["PATCH", "DELETE"].includes(req.method)) {
    const input = req.method === "PATCH" ? await body(req) : null;
    const task = state.tasks.find((t) => t.id === match[1]);
    if (!task) throw new ApiError(404, "Завдання не знайдено.");
    if (req.method === "PATCH") {
      const updated = transition(task, input?.status, state);
      const labels = {
        running: "Запущено",
        completed: "Завершено",
        cancelled: "Скасовано",
      };
      commit(
        {
          ...state,
          tasks: state.tasks.map((t) => (t.id === task.id ? updated : t)),
        },
        `${labels[updated.status]}: ${task.title}`,
      );
      return json(res, 200, updated);
    }
    if (task.status === "running")
      throw new ApiError(409, "Спочатку завершіть або скасуйте завдання.");
    commit(
      { ...state, tasks: state.tasks.filter((t) => t.id !== task.id) },
      `Видалено: ${task.title}`,
    );
    res.writeHead(204);
    return res.end();
  }
  throw new ApiError(404, "API маршрут не знайдено.");
}

function staticFile(req, res, pathname) {
  if (!["GET", "HEAD"].includes(req.method))
    return json(res, 405, { message: "Метод не підтримується." });
  if (!fs.existsSync(path.join(buildDir, "index.html")))
    return json(res, 503, {
      message: "Спочатку виконайте npm run build або запустіть npm start.",
    });
  const candidate = path.resolve(buildDir, "." + decodeURIComponent(pathname));
  if (candidate !== buildDir && !candidate.startsWith(buildDir + path.sep))
    return json(res, 403, { message: "Доступ заборонено." });
  const file =
    fs.existsSync(candidate) && fs.statSync(candidate).isFile()
      ? candidate
      : path.join(buildDir, "index.html");
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
  };
  res.writeHead(200, {
    "Content-Type": types[path.extname(file)] || "application/octet-stream",
  });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, "http://localhost");
    if (pathname.startsWith("/api/")) await api(req, res, pathname);
    else staticFile(req, res, pathname);
  } catch (error) {
    json(res, error.status || 500, {
      message: error.status ? error.message : "Внутрішня помилка сервера.",
    });
    if (!error.status) console.error(error);
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`Robot Planner: http://127.0.0.1:${server.address().port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close(() => process.exit(0)));
