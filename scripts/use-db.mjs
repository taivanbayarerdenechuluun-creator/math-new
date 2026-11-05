// Prisma нь provider-ийг env-ээр сонгохыг зөвшөөрдөггүй тул schema.prisma-г шууд сольж бичнэ.
// Ашиглах: node scripts/use-db.mjs postgresql | sqlite
import { readFileSync, writeFileSync } from "node:fs";

const target = process.argv[2];
if (!["postgresql", "sqlite"].includes(target)) {
  console.error("Ашиглах: node scripts/use-db.mjs postgresql|sqlite");
  process.exit(1);
}
const path = "database/schema.prisma";
const src = readFileSync(path, "utf8");
const out = src.replace(/(datasource db \{\s*provider\s*=\s*)"(sqlite|postgresql)"/, `$1"${target}"`);
if (out === src && !src.includes(`provider = "${target}"`)) {
  console.error("datasource provider олдсонгүй");
  process.exit(1);
}
writeFileSync(path, out);
console.log(`✔ database/schema.prisma → provider = "${target}". Одоо: npx prisma generate`);
