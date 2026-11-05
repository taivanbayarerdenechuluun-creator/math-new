// Vercel дуураймал (production seed, STORAGE_DRIVER=db) дээрх шалгалт.
// node tests/e2e/vercel-sim-check.mjs http://localhost:3500 owner@school.mn StrongPass2026
const [BASE, ADMIN_EMAIL, ADMIN_PASSWORD] = process.argv.slice(2);
let pass = 0;
let fail = 0;
const check = (name, ok, extra = "") => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "✓" : "✗"} ${name} ${ok ? "" : extra}`);
};
const jar = () => {
  let cookie = "";
  return async (path, opts = {}) => {
    const res = await fetch(BASE + path, { redirect: "manual", ...opts, headers: { ...(opts.headers ?? {}), ...(cookie ? { Cookie: cookie } : {}) } });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    const text = await res.text();
    let data = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* html */
    }
    return { status: res.status, data, headers: res.headers };
  };
};
const json = (body) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const anon = jar();
const health = await anon("/api/health");
check("/api/health ok", health.status === 200 && health.data.ok, JSON.stringify(health.data));
check("Хадгалалт: db драйвер", health.data.checks?.storage?.message === "db");
const home = await anon("/");
check("Нүүр хуудас 200, алдаагүй", home.status === 200 && !String(home.data).includes("Алдаа гарлаа"));
check("Демо бүртгэл байхгүй", (await anon("/api/auth/login", json({ email: "admin@iqmath.mn", password: "Admin123!" }))).status === 401);
check("Нэвтрэх хуудсанд демо товч харагдахгүй", !String((await anon("/login")).data).includes("Туршилтын бүртгэлүүд"));

const admin = jar();
check("Таны админ нэвтэрнэ", (await admin("/api/auth/login", json({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }))).status === 200);
const dash = await admin("/admin");
check("Админ самбар 200", dash.status === 200 && !String(dash.data).includes("Алдаа гарлаа"));

const st = jar();
const reg = await st("/api/auth/register", json({ name: "Шинэ сурагч", email: `s${Date.now()}@school.mn`, password: "Student2026", grade: 9 }));
check("Сурагч бүртгүүлнэ", reg.status === 201, JSON.stringify(reg.data));
const solve = await st("/api/solver/solve", json({ input: "x^2-5x+6=0", inputType: "TEXT" }));
check("Бодогч ажиллана", solve.data?.solution?.finalAnswer === "2; 3");
for (const p of ["/student", "/student/learn?grade=9", "/student/practice?grade=9", "/student/exams"]) {
  const r = await st(p);
  check(`${p} 200`, r.status === 200 && !String(r.data).includes("Алдаа гарлаа"), `(${r.status})`);
}

// Зургийг өгөгдлийн санд хадгалж, буцааж уншина (1x1 PNG)
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const fd = new FormData();
fd.append("file", new Blob([png], { type: "image/png" }), "p.png");
const up = await st("/api/solver/recognize", { method: "POST", body: fd });
check("Зураг хадгалагдана (OCR тохируулаагүй ч)", up.status === 200 && up.data.fileId, JSON.stringify(up.data));
const file = await st(`/api/files/${up.data.fileId}`);
check("Хадгалсан зургийг буцааж уншина", file.status === 200 && file.headers.get("content-type") === "image/png");
check("Өөр хэрэглэгч бусдын зургийг харахгүй", (await admin(`/api/files/${up.data.fileId}`)).status === 404);

console.log(`\nДүн: ${pass} амжилттай, ${fail} амжилтгүй`);
process.exit(fail ? 1 : 0);
