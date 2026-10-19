const { spawn } = require("node:child_process");
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => child.kill("SIGTERM"));
  setTimeout(() => process.exit(code), 300);
}
function run(file, env = {}) {
  const child = spawn(process.execPath, [file], {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  children.push(child);
  child.on("error", (error) => {
    console.error(error);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) stop(code || 0);
  });
}
run("server/index.cjs", { PORT: process.env.API_PORT || "4004" });
run(require.resolve("react-scripts/scripts/start"), {
  PORT: "3004",
  HOST: "127.0.0.1",
  BROWSER: "none",
  ROBOT_API_PORT: process.env.API_PORT || "4004",
});
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
