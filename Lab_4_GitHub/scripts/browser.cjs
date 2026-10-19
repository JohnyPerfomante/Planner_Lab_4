const { chromium, firefox } = require(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const out = path.join(root, "test-output");
fs.mkdirSync(out, { recursive: true });
const localInput = (value) => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

async function run(engine, name, launchOptions) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "robot-browser-"));
  const server = spawn(process.execPath, ["server/index.cjs"], {
    cwd: root,
    env: { ...process.env, PORT: "0", DATA_FILE: path.join(dir, "state.json") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let browser;
  try {
    const base = await new Promise((resolve, reject) => {
      server.stdout.once("data", (value) =>
        resolve(value.toString().trim().split(" ").at(-1)),
      );
      server.once("error", reject);
      server.once("exit", (code) =>
        reject(new Error(`API завершився: ${code}`)),
      );
    });
    browser = await engine.launch({ headless: true, ...launchOptions });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      timezoneId: "Europe/Kyiv",
    });
    const page = await context.newPage();
    const errors = [];
    const checks = [];
    const external = [];
    let documents = 0;
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (req) => {
      if (req.resourceType() === "document") documents++;
    });
    page.on("response", (res) => {
      if (res.url().includes("api.open-meteo.com"))
        external.push({ url: res.url(), status: res.status() });
    });
    async function check(label, action) {
      await action();
      checks.push(label);
      console.log(`${name}: ${label}`);
    }
    const row = (title) =>
      page
        .locator("tbody tr")
        .filter({ has: page.getByText(title, { exact: true }) });
    const state = async () => (await fetch(base + "/api/state")).json();
    async function form(title, startAt = Date.now() + 300 * 60000) {
      await page.locator("#title").fill(title);
      await page.locator("#platformId").selectOption("nova");
      await page.locator("#startAt").fill(localInput(startAt));
      await page.locator("#duration").fill("25");
      await page.locator("#priority").selectOption("high");
      await page
        .locator("#description")
        .fill("Перевірити контрольні точки складської зони.");
    }
    await page.goto(base);
    await page.getByRole("heading", { name: "Огляд місій" }).waitFor();
    await check("API завантажує парк і чотири початкові завдання", async () => {
      assert.equal((await state()).tasks.length, 4);
      assert.equal(await page.locator(".metric").count(), 4);
      assert.equal(await page.locator("tbody tr").count(), 3);
    });
    await page.waitForFunction(
      () => {
        const el = document.querySelector(".weather");
        return el && !el.textContent.includes("Отримання погоди");
      },
      { timeout: 12000 },
    );
    if (name === "Chrome")
      await page.screenshot({
        path: path.join(out, "01-dashboard.png"),
        fullPage: true,
      });
    await check(
      "React Router перемикає сторінки без завантаження документа",
      async () => {
        const before = documents;
        await page
          .getByRole("link", { name: "Платформи", exact: true })
          .click();
        await page
          .getByRole("heading", { name: "Платформи", exact: true })
          .waitFor();
        assert.equal(await page.locator(".platform-card").count(), 4);
        await page.getByRole("link", { name: "Завдання", exact: true }).click();
        await page
          .getByRole("heading", { name: "Завдання", exact: true })
          .waitFor();
        assert.equal(documents, before);
      },
    );
    await check(
      "Глибокий маршрут форми працює після перезавантаження",
      async () => {
        await page.goto(base + "/tasks/new");
        await page.reload();
        await page.locator("#title").waitFor();
      },
    );
    await check("Порожня назва та назва з пробілів відхиляються", async () => {
      for (const title of ["", "   "]) {
        await page.locator("#title").fill(title);
        await page
          .getByRole("button", { name: "Запланувати завдання", exact: true })
          .click();
        await page
          .getByText("Назва має містити від 3 до 100 символів.", {
            exact: true,
          })
          .waitFor();
      }
      assert.equal((await state()).tasks.length, 4);
    });
    await check(
      "Минулий час та дробова тривалість не надсилаються",
      async () => {
        await form("Інспекція складської зони", Date.now() - 60000);
        await page
          .getByRole("button", { name: "Запланувати завдання", exact: true })
          .click();
        await page
          .getByText("Оберіть час початку в майбутньому.", { exact: true })
          .waitFor();
        await page
          .locator("#startAt")
          .fill(localInput(Date.now() + 300 * 60000));
        await page.locator("#duration").fill("5.5");
        await page
          .getByRole("button", { name: "Запланувати завдання", exact: true })
          .click();
        await page
          .getByText("Тривалість має бути цілим числом від 5 до 480 хвилин.", {
            exact: true,
          })
          .waitFor();
      },
    );
    await check("Недоступні платформи вимкнені у формі", async () => {
      assert.equal(
        await page.locator('#platformId option[value="vector"]').isDisabled(),
        true,
      );
      assert.equal(
        await page.locator('#platformId option[value="orion"]').isDisabled(),
        true,
      );
    });
    const title = "Інспекція складської зони";
    await form(title);
    if (name === "Chrome")
      await page.screenshot({
        path: path.join(out, "02-form.png"),
        fullPage: true,
      });
    await check(
      "POST створює місію та блокує повтор під час очікування",
      async () => {
        const button = page.getByRole("button", {
          name: "Запланувати завдання",
          exact: true,
        });
        await button.click();
        assert.equal(
          await page.getByRole("button", { name: "Збереження…" }).isDisabled(),
          true,
        );
        await page.waitForURL("**/tasks");
        await row(title).waitFor();
        assert.equal(
          (await state()).tasks.filter((t) => t.title === title).length,
          1,
        );
        await page
          .getByText("Завдання успішно заплановано.", { exact: true })
          .waitFor();
      },
    );
    if (name === "Chrome")
      await page.screenshot({
        path: path.join(out, "03-tasks.png"),
        fullPage: true,
      });
    await check(
      "Перетин розкладу повертає HTTP 409 і зберігає форму",
      async () => {
        const task = (await state()).tasks.find((t) => t.title === title);
        await page
          .getByRole("link", { name: "Нове завдання", exact: true })
          .click();
        await form("Конфліктна місія", Date.parse(task.startAt));
        await page
          .getByRole("button", { name: "Запланувати завдання", exact: true })
          .click();
        await page
          .getByText(
            "Платформа вже має завдання в цей час. Оберіть інший проміжок.",
            { exact: true },
          )
          .waitFor();
        assert.equal(
          await page.locator("#title").inputValue(),
          "Конфліктна місія",
        );
        assert.equal((await state()).tasks.length, 5);
      },
    );
    if (name === "Chrome")
      await page.screenshot({
        path: path.join(out, "04-conflict.png"),
        fullPage: true,
      });
    await check(
      "Пошук і фільтри за платформою та статусом працюють",
      async () => {
        await page.getByRole("link", { name: "Завдання", exact: true }).click();
        await page.getByLabel("Пошук").fill("складської");
        assert.equal(await page.locator("tbody tr").count(), 1);
        await page.locator(".filters select").nth(0).selectOption("completed");
        await page.getByText("Завдань поки немає").waitFor();
        await page.locator(".filters select").nth(0).selectOption("planned");
        await page.locator(".filters select").nth(1).selectOption("nova");
        assert.equal(await page.locator("tbody tr").count(), 1);
        await page.getByLabel("Пошук").fill("");
        await page.locator(".filters select").nth(0).selectOption("");
        await page.locator(".filters select").nth(1).selectOption("");
      },
    );
    await check(
      "Завершення поточної місії зберігається через PATCH",
      async () => {
        await row("Доставка комплектувальних")
          .getByRole("button", { name: "Завершити", exact: true })
          .click();
        await row("Доставка комплектувальних")
          .getByText("Завершено", { exact: true })
          .waitFor();
        assert.equal(
          (await state()).tasks.find((t) => t.id === "demo-1").status,
          "completed",
        );
      },
    );
    await check("Передчасний запуск відхиляється сервером", async () => {
      await row(title)
        .getByRole("button", { name: "Запустити", exact: true })
        .click();
      await page
        .getByText("Запуск можливий після запланованого часу початку.", {
          exact: false,
        })
        .waitFor();
      assert.equal(
        (await state()).tasks.find((t) => t.title === title).status,
        "planned",
      );
    });
    await check(
      "Скасування звільняє розклад, видалення потребує підтвердження",
      async () => {
        await row(title)
          .getByRole("button", { name: "Скасувати", exact: true })
          .click();
        await row(title).getByText("Скасовано", { exact: true }).waitFor();
        await row(title)
          .getByRole("button", { name: `Видалити ${title}`, exact: true })
          .click();
        assert.equal(
          (await state()).tasks.some((t) => t.title === title),
          true,
        );
        await row(title)
          .getByRole("button", { name: "Так, видалити", exact: true })
          .click();
        await row(title).waitFor({ state: "detached" });
      },
    );
    await check("HTML у назві показується текстом", async () => {
      await page
        .getByRole("link", { name: "Нове завдання", exact: true })
        .click();
      await form('<img src=x onerror="window.injected=1">');
      await page
        .getByRole("button", { name: "Запланувати завдання", exact: true })
        .click();
      await page.waitForURL("**/tasks");
      await row('<img src=x onerror="window.injected=1">').waitFor();
      assert.equal(await page.locator("tbody img").count(), 0);
      assert.equal(await page.evaluate(() => window.injected), undefined);
    });
    await check(
      "Втрата API показує помилку, повторний запит відновлює панель",
      async () => {
        await page.route("**/api/state", (route) =>
          route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ message: "Тестова втрата API" }),
          }),
        );
        await page
          .getByRole("button", { name: "↻ Оновити", exact: true })
          .click();
        await page
          .getByRole("alert")
          .filter({ hasText: "Тестова втрата API" })
          .waitFor();
        assert.equal(await page.locator("tbody tr").count(), 5);
        await page.unroute("**/api/state");
        await page
          .getByRole("button", { name: "Повторити запит", exact: true })
          .click();
        await page.getByRole("alert").waitFor({ state: "detached" });
      },
    );
    await check(
      "Зовнішній API має окремий стан помилки та повтор",
      async () => {
        await page.route("**/api.open-meteo.com/**", (route) => route.abort());
        await page.getByRole("link", { name: "Огляд", exact: true }).click();
        await page
          .getByText("Не вдалося отримати погоду.", { exact: false })
          .waitFor();
        assert.equal(
          await page
            .getByRole("button", { name: "Повторити", exact: true })
            .isVisible(),
          true,
        );
        await page.unroute("**/api.open-meteo.com/**");
      },
    );
    await check(
      "Екрани 390 і 320 px не мають горизонтального переповнення сторінки",
      async () => {
        for (const url of ["/tasks", "/tasks/new", "/platforms"]) {
          await page.goto(base + url);
          await page.locator("main h1").waitFor();
          for (const width of [390, 320]) {
            await page.setViewportSize({ width, height: 844 });
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= window.innerWidth,
              ),
              true,
              `${url} @ ${width}`,
            );
          }
        }
        await page.setViewportSize({ width: 390, height: 844 });
        if (name === "Chrome")
          await page.screenshot({
            path: path.join(out, "05-mobile.png"),
            fullPage: true,
          });
      },
    );
    await check("Невідомий маршрут показує сторінку 404", async () => {
      await page.goto(base + "/unknown");
      await page
        .getByRole("heading", { name: "Сторінку не знайдено" })
        .waitFor();
    });
    assert.deepEqual(errors, []);
    return {
      browser: name,
      version: browser.version(),
      checks,
      pageErrors: errors,
      externalApiResponses: external,
    };
  } finally {
    if (browser) await browser.close();
    if (server.exitCode === null) {
      const ended = new Promise((resolve) => server.once("exit", resolve));
      server.kill("SIGTERM");
      await ended;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

(async () => {
  const results = [];
  results.push(await run(chromium, "Chrome", { channel: "chrome" }));
  results.push(await run(firefox, "Firefox", {}));
  fs.writeFileSync(
    path.join(out, "browser-results.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify(results, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
