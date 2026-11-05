// Тусдаа e2e.db сан үүсгэж seed хийгээд, production сервер асааж smoke тестийг ажиллуулна.
// Хөгжүүлэлтийн dev.db-д огт хүрэхгүй. Эхлээд `npm run build` хийсэн байх ёстой.
import { spawn, execSync } from "node:child_process";
import { rmSync } from "node:fs";

const env = { ...process.env, DATABASE_URL: "file:./e2e.db", RATE_LIMIT_MULTIPLIER: "100" };
const PORT = process.env.E2E_PORT ?? "3200";
rmSync("database/e2e.db", { force: true });
execSync("npx prisma db push --skip-generate", { env, stdio: "inherit" });
execSync("npx tsx database/seed/seed.ts", { env, stdio: "inherit" });

const server = spawn("npx", ["next", "start", "-p", PORT], { env, shell: true, stdio: ["ignore", "pipe", "pipe"] });
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));

const base = `http://localhost:${PORT}`;
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(base)).ok) break;
  } catch {
    /* сервер асаж байна */
  }
  await new Promise((r) => setTimeout(r, 1000));
}
const test = spawn("node", ["tests/e2e/smoke.mjs", base], { stdio: "inherit" });
const code = await new Promise((r) => test.on("exit", r));
const serverErrors = log.split("\n").filter((l) => /⨯|Error:/.test(l));
if (serverErrors.length) {
  console.log("Серверийн лог дахь алдаанууд:\n" + serverErrors.join("\n"));
}
server.kill();
if (process.platform === "win32") {
  try {
    execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT} ^| findstr LISTENING') do taskkill /F /PID %a`, { stdio: "ignore", shell: "cmd.exe" });
  } catch {
    /* */
  }
}
process.exit(code || (serverErrors.length ? 1 : 0));
