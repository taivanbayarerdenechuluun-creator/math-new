// Vercel (эсвэл ямар ч PostgreSQL орчин) дээрх build:
//  1) DATABASE_URL шалгах — SQLite (file:) байвал тодорхой алдаа өгч зогсоно
//  2) schema-г PostgreSQL болгож, (байвал) unpooled холболтыг migration-д ашиглах
//  3) prisma generate → migrate deploy (байгаа өгөгдлийг устгахгүй)
//  4) Сан хоосон бол анхны агуулга (SEED_MODE=production: ADMIN_EMAIL/ADMIN_PASSWORD-оор админ)
//  5) next build
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};
const run = (cmd, env = process.env) => execSync(cmd, { stdio: "inherit", env });

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
run("npx prisma migrate deploy");

// Анхны агуулга: зөвхөн хоосон санд (seed өөрөө хоосон эсэхийг шалгана)
const seedEnv = { ...process.env, SEED_MODE: process.env.SEED_DEMO_USERS === "true" ? "" : "production" };
if (seedEnv.SEED_MODE === "production" && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
  console.log("⚠ ADMIN_EMAIL / ADMIN_PASSWORD тохируулаагүй тул анхны агуулга оруулахыг алгаслаа (сан хоосон бол сайт хоосон харагдана).");
} else {
  run("npx tsx database/seed/seed.ts", seedEnv);
  run("npx tsx database/seed/sync-content.ts");
}
run("npx next build");
