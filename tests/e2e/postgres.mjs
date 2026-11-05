// PostgreSQL дээрх бүрэн шалгалт: provider-ийг postgresql болгож, migration хэрэгжүүлж, seed хийгээд
// production сервер дээр smoke тест ажиллуулна. Эцэст нь SQLite руу буцаана.
// Шаардлага: `docker compose up -d db` (localhost:5433), өмнө нь `npm run build` хийсэн байх.
import { execSync, spawn } from "node:child_process";

const PORT = "3400";
const URL = process.env.PG_TEST_URL ?? "postgresql://iqmath:iqmath_dev_password@localhost:5433/iqmath_e2e";
const env = { ...process.env, DATABASE_URL: URL, RATE_LIMIT_MULTIPLIER: "100" };
const run = (cmd, e = env) => execSync(cmd, { env: e, stdio: "inherit" });

let code = 1;
let server;
try {
  run("docker compose exec -T db psql -U iqmath -d postgres -c \"DROP DATABASE IF EXISTS iqmath_e2e\" -c \"CREATE DATABASE iqmath_e2e\"", process.env);
  run("node scripts/use-db.mjs postgresql");
  run("npx prisma generate");
  run("npx prisma migrate deploy");
  run("npx tsx database/seed/seed.ts");

  server = spawn("npx", ["next", "start", "-p", PORT], { env, shell: true, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  server.stdout.on("data", (d) => (log += d));
  server.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://localhost:${PORT}`)).ok) break;
    } catch {
      /* асаж байна */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  const test = spawn("node", ["tests/e2e/smoke.mjs", `http://localhost:${PORT}`], { stdio: "inherit" });
  code = await new Promise((r) => test.on("exit", r));
  const errs = log.split("\n").filter((l) => /⨯|Error:/.test(l));
  if (errs.length) {
    console.log("Серверийн лог дахь алдаанууд:\n" + errs.join("\n"));
    code = code || 1;
  }
} finally {
  server?.kill();
  if (process.platform === "win32") {
    try {
      execSync(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${PORT} ^| findstr LISTENING') do taskkill /F /PID %a`, { stdio: "ignore", shell: "cmd.exe" });
    } catch {
      /* */
    }
  }
  execSync("node scripts/use-db.mjs sqlite", { stdio: "inherit" });
  execSync("npx prisma generate", { stdio: "inherit" });
}
process.exit(code);
