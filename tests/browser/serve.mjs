// Хөтчийн тестэд зориулж цэвэр e2e-browser.db сан үүсгэж seed хийгээд production серверийг асаана.
import { execSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";

const port = process.argv[2] ?? "3300";
const env = { ...process.env, DATABASE_URL: "file:./e2e-browser.db", RATE_LIMIT_MULTIPLIER: "100" };
rmSync("database/e2e-browser.db", { force: true });
execSync("npx prisma db push --skip-generate", { env, stdio: "inherit" });
execSync("npx tsx database/seed/seed.ts", { env, stdio: "inherit" });
const child = spawn("npx", ["next", "start", "-p", port], { env, stdio: "inherit", shell: true });
const stop = () => child.kill();
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.on("exit", (c) => process.exit(c ?? 0));
