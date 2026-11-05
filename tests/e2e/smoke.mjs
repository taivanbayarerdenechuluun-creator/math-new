// End-to-end smoke test: ажиллаж буй сервер дээр гол урсгалуудыг HTTP-ээр шалгана.
// Ашиглах: node tests/e2e/smoke.mjs [baseUrl]   (seed хийсэн өгөгдлийн сан шаардлагатай)
const BASE = process.argv[2] ?? "http://localhost:3000";
let passed = 0;
let failed = 0;

function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name} ${extra}`);
  }
}

// Server component алдаа гарвал Next нь 200 буцаагаад error boundary рендерлэдэг тул HTML-ийг шалгана
const pageOk = (html) => typeof html === "string" && !html.includes("Алдаа гарлаа") && !html.includes("Application error") && !html.includes("NEXT_HTTP_ERROR");

class Client {
  cookie = "";
  async req(path, { method = "GET", json, body, redirect = "manual" } = {}) {
    const res = await fetch(BASE + path, {
      method,
      redirect,
      headers: { ...(json ? { "Content-Type": "application/json" } : {}), ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: json ? JSON.stringify(json) : body,
    });
    const set = res.headers.get("set-cookie");
    if (set) this.cookie = set.split(";")[0];
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, data, location: res.headers.get("location") };
  }
  login(email, password) {
    return this.req("/api/auth/login", { method: "POST", json: { email, password } });
  }
}

console.log(`\nIQ MATH smoke test → ${BASE}\n`);

// ── Нийтийн хуудас ба хамгаалалт ──
console.log("Нийтийн хэсэг ба middleware");
const anon = new Client();
check("Нүүр хуудас 200", (await anon.req("/")).status === 200);
const prot = await anon.req("/student");
check("Нэвтрээгүй /student → /login", prot.status === 307 && prot.location?.includes("/login"));
check("Нэвтрээгүй API → 401", (await anon.req("/api/notifications")).status === 401);
check("Буруу нууц үг → 401", (await anon.login("student@iqmath.mn", "wrong")).status === 401);

// ── Сурагч ──
console.log("Сурагч");
const st = new Client();
check("Сурагч нэвтрэх", (await st.login("student@iqmath.mn", "Student123!")).status === 200);
for (const p of ["/student", "/student/learn", "/student/solve", "/student/tutor", "/student/practice", "/student/exams", "/student/progress", "/student/saved", "/student/profile"]) {
  const r = await st.req(p);
  check(`${p} 200, алдаагүй`, r.status === 200 && pageOk(r.data), `(${r.status})`);
}
const adminAttempt = await st.req("/admin");
check("Сурагч /admin → /student руу чиглүүлэгдэнэ", adminAttempt.status === 307 && adminAttempt.location?.includes("/student"));
check("Сурагч админ API → 403", (await st.req("/api/admin/questions", { method: "POST", json: {} })).status === 403);
check("Сурагч хэрэглэгч үүсгэх → 403", (await st.req("/api/admin/users", { method: "POST", json: {} })).status === 403);

const solve = await st.req("/api/solver/solve", { method: "POST", json: { input: "x^2-5x+6=0", inputType: "TEXT" } });
check("Бодогч: квадрат тэгшитгэл", solve.status === 200 && solve.data.solution?.finalAnswer === "2; 3", JSON.stringify(solve.data).slice(0, 200));
check("Бодогч: шалгагдсан", solve.data.solution?.verification === "VERIFIED");
const solve2 = await st.req("/api/solver/solve", { method: "POST", json: { input: "Тэгшитгэлийг бод: $3x - 7 = 11$", inputType: "TEXT" } });
check("Бодогч: монгол заавар + томьёо", solve2.status === 200 && solve2.data.solution?.finalAnswer === "6", JSON.stringify(solve2.data).slice(0, 200));
const hist = await st.req(`/api/solver/history/${solve.data.id}`, { method: "PATCH", json: { isFavorite: true } });
check("Түүх: хадгалах", hist.status === 200 && hist.data.isFavorite === true);
check("Түүхийн дэлгэрэнгүй 200", (await st.req(`/student/solve/history/${solve.data.id}`)).status === 200);
const empty = await st.req("/api/solver/solve", { method: "POST", json: { input: "", inputType: "TEXT" } });
check("Хоосон оролт → 400 монгол мессеж", empty.status === 400 && /Бодлого|оруулна/.test(empty.data.error));

// Дасгал: хуудаснаас асуултын ID олох боломжгүй тул API-аар сургалтын хуудсыг ашиглана
const practicePage = await st.req("/student/practice?grade=9");
check("Дасгалын хуудас 200", practicePage.status === 200);

// Шалгалт
const examsHtml = (await st.req("/student/exams?grade=all")).data;
const examId = String(examsHtml).match(/\/student\/exams\/([a-z0-9]{20,})/)?.[1];
check("Шалгалтын жагсаалтаас ID олдлоо", Boolean(examId));
if (examId) {
  const start = await st.req(`/api/exams/${examId}/start`, { method: "POST" });
  check("Шалгалт эхлүүлэх", start.status === 200 && start.data.attemptId, JSON.stringify(start.data));
  const again = await st.req(`/api/exams/${examId}/start`, { method: "POST" });
  check("Дахин эхлүүлэхэд ижил оролдлого (refresh-ээс хамгаалах)", again.data.attemptId === start.data.attemptId);
  const attemptPage = await st.req(`/student/exams/attempt/${start.data.attemptId}`);
  check("Шалгалтын хуудас 200", attemptPage.status === 200);
  check("Зөв хариу HTML-д задраагүй", !String(attemptPage.data).includes("isCorrect\\\":true") && !String(attemptPage.data).includes('"correctAnswer"'));
  const bad = await st.req(`/api/attempts/${start.data.attemptId}/answer`, { method: "PUT", json: { questionId: "nope", answer: "1", marked: false } });
  check("Шалгалтад хамааралгүй асуулт → 400", bad.status === 400);
  const sub = await st.req(`/api/attempts/${start.data.attemptId}/submit`, { method: "POST", json: { answers: [] } });
  check("Шалгалт илгээх", sub.status === 200 && typeof sub.data.percentage === "number", JSON.stringify(sub.data));
  const late = await st.req(`/api/attempts/${start.data.attemptId}/answer`, { method: "PUT", json: { questionId: "x", answer: "1", marked: false } });
  check("Илгээсний дараа хариу өөрчлөх → 409", late.status === 409);
  check("Үр дүнгийн хуудас 200", (await st.req(`/student/exams/result/${start.data.attemptId}`)).status === 200);
}

const tutor = await st.req("/api/tutor/conversations", { method: "POST", json: { mode: "STANDARD", guided: true } });
check("AI яриа үүсгэх", tutor.status === 201);
const msg = await st.req(`/api/tutor/conversations/${tutor.data.id}/messages`, { method: "POST", json: { content: "Сайн уу" } });
check("AI тохируулаагүй бол 503 тодорхой мессеж (эсвэл 200 stream)", msg.status === 503 || msg.status === 200, `(${msg.status})`);

// ── Багш ──
console.log("Багш");
const te = new Client();
check("Багш нэвтрэх", (await te.login("teacher@iqmath.mn", "Teacher123!")).status === 200);
for (const p of ["/admin", "/admin/questions", "/admin/questions/new", "/admin/import", "/admin/review", "/admin/curriculum", "/admin/exams", "/admin/exams/new", "/admin/students"]) {
  const r = await te.req(p);
  check(`${p} 200, алдаагүй`, r.status === 200 && pageOk(r.data), `(${r.status})`);
}
check("Багш /admin/users руу хандахгүй", (await te.req("/admin/users")).status === 307);
check("Багш хэрэглэгч үүсгэх API → 403", (await te.req("/api/admin/users", { method: "POST", json: { name: "x", email: "x@x.mn", password: "Abcdefg1", role: "ADMIN" } })).status === 403);

const qPayload = {
  gradeId: 8,
  topicId: null,
  type: "NUMERIC",
  difficulty: 1,
  text: `Бод: $7 \\cdot 8 + ${Date.now() % 1000}$`,
  correctAnswer: String(56 + (Date.now() % 1000)),
  tolerance: null,
  explanation: "үржүүлээд нэмнэ",
  relatedFormulas: [],
  tags: ["e2e"],
  options: [],
  solutionSteps: [],
};
const created = await te.req("/api/admin/questions", { method: "POST", json: { ...qPayload, submitForReview: true } });
check("Багш бодлого үүсгэх (NEEDS_REVIEW)", created.status === 201 && created.data.code, JSON.stringify(created.data));
const selfVerify = await te.req(`/api/admin/questions/${created.data.id}/status`, { method: "POST", json: { to: "VERIFIED" } });
check("Өөрийн бодлогыг өөрөө баталгаажуулах → 403", selfVerify.status === 403);
const skipPublish = await te.req(`/api/admin/questions/${created.data.id}/status`, { method: "POST", json: { to: "PUBLISHED" } });
check("Баталгаажаагүйг шууд нийтлэх → 400", skipPublish.status === 400);
const check1 = await te.req("/api/admin/questions/assist", { method: "POST", json: { action: "check", text: qPayload.text, type: "NUMERIC", correctAnswer: qPayload.correctAnswer } });
check("Хариуг тооцооллоор шалгах: MATCH", check1.data.status === "MATCH", JSON.stringify(check1.data));
const dup = await te.req("/api/admin/import/template?format=csv");
check("CSV загвар татах", dup.status === 200 && String(dup.data).includes("grade"));
const csv = `grade,topic,type,difficulty,text,optionA,optionB,optionC,optionD,optionE,correct,tolerance,explanation,tags,source\n7,g7-linear-equations,NUMERIC,1,"E2E bulk ${Date.now()}: $2x = 10$",,,,,,5,,x=5,e2e,E2E\n7,unknown-topic,NUMERIC,1,"bad row",,,,,,,,,,\n`;
const fd = new FormData();
fd.append("file", new Blob([csv], { type: "text/csv" }), "e2e.csv");
fd.append("mode", "preview");
const prev = await te.req("/api/admin/import/bulk", { method: "POST", body: fd });
check("Бөөн импорт: урьдчилан харах (1 зөв, 1 алдаатай)", prev.status === 200 && prev.data.valid === 1 && prev.data.invalid === 1, JSON.stringify(prev.data).slice(0, 300));
const fd2 = new FormData();
fd2.append("file", new Blob([csv], { type: "text/csv" }), "e2e.csv");
fd2.append("mode", "commit");
const commit = await te.req("/api/admin/import/bulk", { method: "POST", body: fd2 });
check("Бөөн импорт: хэсэгчилсэн (1 амжилттай)", commit.status === 200 && commit.data.succeeded === 1 && commit.data.failed === 1, JSON.stringify(commit.data));

// ── Админ ──
console.log("Админ");
const ad = new Client();
check("Админ нэвтрэх", (await ad.login("admin@iqmath.mn", "Admin123!")).status === 200);
for (const p of ["/admin/users", "/admin/analytics", "/admin/audit", `/admin/questions/${created.data.id}`]) {
  const r = await ad.req(p);
  check(`${p} 200, алдаагүй`, r.status === 200 && pageOk(r.data), `(${r.status})`);
}
const v = await ad.req(`/api/admin/questions/${created.data.id}/status`, { method: "POST", json: { to: "VERIFIED" } });
check("Админ баталгаажуулах", v.status === 200 && v.data.status === "VERIFIED", JSON.stringify(v.data));
const pub = await ad.req(`/api/admin/questions/${created.data.id}/status`, { method: "POST", json: { to: "PUBLISHED" } });
check("Админ нийтлэх", pub.status === 200 && pub.data.status === "PUBLISHED");
const edit = await ad.req(`/api/admin/questions/${created.data.id}`, { method: "PUT", json: { ...qPayload, correctAnswer: "1" } });
check("Нийтлэгдсэн бодлогын хариуг өөрчлөхөд дахин хянуулах төлөвт орно", edit.status === 200 && edit.data.status === "NEEDS_REVIEW", JSON.stringify(edit.data));

// Сурагч дасгалын хариу: нийтлэгдсэн асуулт дээр
const pubQ = await ad.req("/admin/questions?status=PUBLISHED&grade=6");
const qid = String(pubQ.data).match(/\/admin\/questions\/([a-z0-9]{20,})/)?.[1];
if (qid) {
  const ans = await st.req("/api/practice/answer", { method: "POST", json: { questionId: qid, answer: "zzz", timeSpentSec: 5 } });
  check("Сурагчийн дасгалын хариу үнэлэгдэнэ", ans.status === 200 && typeof ans.data.isCorrect === "boolean", JSON.stringify(ans.data).slice(0, 200));
}
const unpublished = await st.req("/api/practice/answer", { method: "POST", json: { questionId: created.data.id, answer: "1" } });
check("Нийтлэгдээгүй бодлогод сурагч хариулах → 404", unpublished.status === 404);

const unit = await ad.req("/api/admin/curriculum/units", { method: "POST", json: { gradeId: 10, title: "E2E бүлэг", domain: "ALGEBRA", order: 99 } });
check("Хөтөлбөр: бүлэг үүсгэх", unit.status === 201);
const topic = await ad.req("/api/admin/curriculum/topics", { method: "POST", json: { unitId: unit.data.id, title: "E2E сэдэв" } });
check("Хөтөлбөр: сэдэв үүсгэх", topic.status === 201 && topic.data.slug);
check("Хөтөлбөр: бүлэг устгах", (await ad.req(`/api/admin/curriculum/units/${unit.data.id}`, { method: "DELETE" })).status === 200);
check("Багш албан ёсны гэж тэмдэглэх → 403", (await te.req("/api/admin/curriculum/units", { method: "POST", json: { gradeId: 10, title: "X бүлэг", domain: "ALGEBRA", isOfficial: true } })).status === 403);

console.log(`\nДүн: ${passed} амжилттай, ${failed} амжилтгүй\n`);
process.exit(failed ? 1 : 0);
