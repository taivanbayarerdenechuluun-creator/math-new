// Vercel (эсвэл ямар ч PostgreSQL орчин) дээрх build:
//  1) DATABASE_URL шалгах — SQLite (file:) байвал тодорхой алдаа өгч зогсоно
//  2) schema-г PostgreSQL болгож, (байвал) unpooled холболтыг migration-д ашиглах
//  3) prisma generate → migrate deploy (байгаа өгөгдлийг устгахгүй)
//     Сан өөр хүснэгттэй (жишээ нь Neon Auth) бол P3005 алдааг зохицуулж migration-ыг хэрэгжүүлнэ
//  4) Сан хоосон бол анхны агуулга (SEED_MODE=production: ADMIN_EMAIL/ADMIN_PASSWORD-оор админ)
//  5) next build
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

/** Команд ажиллуулж, гаралтыг хэвлэн буцаана. throwOnError=false бол алдаагаа буцаана. */
function run(cmd, { env = process.env, capture = false, allowFail = false } = {}) {
  console.log(`\n$ ${cmd}`);
  const r = spawnSync(cmd, { shell: true, env, encoding: "utf8", stdio: capture ? ["inherit", "pipe", "pipe"] : "inherit" });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  if (capture) process.stdout.write(out);
  if (r.status !== 0 && !allowFail) fail(`"${cmd}" амжилтгүй боллоо (дээрх алдааг харна уу).`);
  return { ok: r.status === 0, out };
}

const url = process.env.DATABASE_URL ?? "";
if (!url) fail("DATABASE_URL тохируулаагүй байна. Vercel → Storage → Neon (эсвэл Supabase) PostgreSQL холбоно уу.");
if (!/^postgres(ql)?:\/\//.test(url)) fail(`DATABASE_URL нь PostgreSQL холболт байх ёстой ("${url.split(":")[0]}:" биш). Vercel дээр SQLite ажиллахгүй.`);
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) fail("AUTH_SECRET тохируулаагүй эсвэл 32 тэмдэгтээс богино байна.");

// Neon/Supabase-ийн pooler нь migration-д тохиромжгүй тул шууд холболтыг ашиглана
const direct = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.POSTGRES_URL_NON_POOLING;
const schemaPath = "database/schema.prisma";
let schema = readFileSync(schemaPath, "utf8").replace(/(datasource db \{\s*provider\s*=\s*)"sqlite"/, '$1"postgresql"');
if (direct && !schema.includes("directUrl")) {
  process.env.IQM_DIRECT_URL = direct;
  schema = schema.replace(/(url\s*=\s*env\("DATABASE_URL"\))/, '$1\n  directUrl = env("IQM_DIRECT_URL")');
}
writeFileSync(schemaPath, schema);
console.log(`→ PostgreSQL schema${direct ? " (migration-д шууд холболт)" : ""}`);

run("npx prisma generate");

const migrate = run("npx prisma migrate deploy", { capture: true, allowFail: true });
if (!migrate.ok) {
  if (!migrate.out.includes("P3005")) {
    const hint = /P1001|P1002|ECONNREFUSED|ENOTFOUND/.test(migrate.out)
      ? "Өгөгдлийн сантай холбогдож чадсангүй — DATABASE_URL зөв эсэх, Neon сан идэвхтэй эсэхийг шалгана уу."
      : /P1000|authentication failed/i.test(migrate.out)
        ? "Өгөгдлийн сангийн нэвтрэх мэдээлэл буруу байна — Neon-ыг төсөлд дахин холбоно уу."
        : "Migration амжилтгүй боллоо — дээрх Prisma-ийн алдааг харна уу.";
    fail(hint);
  }
  // P3005: сан хоосон биш (өөр систем, жишээ нь Neon Auth, хүснэгт үүсгэсэн), migration-ы түүх алга.
  // Манай хүснэгтүүд байхгүй бол migration SQL-уудыг шууд хэрэгжүүлж, "хэрэгжсэн" гэж тэмдэглэнэ.
  console.log("\n→ Сан хоосон биш (P3005). Манай хүснэгтүүдийг шалгаж байна…");
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasourceUrl: direct || url });
  const rows = await db.$queryRawUnsafe(`SELECT to_regclass('public."User"')::text AS t`);
  const others = await db.$queryRawUnsafe(
    `SELECT table_schema || '.' || table_name AS t FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1 LIMIT 20`,
  );
  await db.$disconnect();
  console.log(`  Санд байгаа хүснэгтүүд: ${others.map((r) => r.t).join(", ") || "(алга)"}`);
  const ours = Boolean(rows[0]?.t);
  const migrations = readdirSync("database/migrations", { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const m of migrations) {
    if (!ours) run(`npx prisma db execute --schema ${schemaPath} --file database/migrations/${m}/migration.sql`);
    run(`npx prisma migrate resolve --schema ${schemaPath} --applied ${m}`, { allowFail: ours });
  }
  // Дараагийн migration-ууд байвал хэрэгжүүлнэ
  run("npx prisma migrate deploy");
}

// Анхны агуулга: зөвхөн хоосон санд (seed өөрөө хоосон эсэхийг шалгана)
const seedEnv = { ...process.env, SEED_MODE: process.env.SEED_DEMO_USERS === "true" ? "" : "production" };
if (seedEnv.SEED_MODE === "production" && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
  console.log("⚠ ADMIN_EMAIL / ADMIN_PASSWORD тохируулаагүй тул анхны агуулга оруулахыг алгаслаа (сан хоосон бол сайт хоосон харагдана).");
} else {
  run("npx tsx database/seed/seed.ts", { env: seedEnv });
  run("npx tsx database/seed/sync-content.ts");
}
run("npx next build");
