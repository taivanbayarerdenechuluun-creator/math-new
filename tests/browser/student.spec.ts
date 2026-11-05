import { expect, test } from "@playwright/test";
import { login, shot, trackErrors } from "./helpers";

test.describe("Нийтийн хэсэг", () => {
  test("нүүр хуудас ба интерактив парабол", async ({ page }) => {
    const t = trackErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Математикийг");
    // Гулсуур өөрчлөхөд язгуурын мэдээлэл шинэчлэгдэнэ
    const before = await page.getByText(/Язгуур:|Бодит язгуургүй/).textContent();
    await page.getByLabel("c коэффициент").fill("4");
    await expect(page.getByText(/Язгуур:|Бодит язгуургүй/)).not.toHaveText(before ?? "");
    // Бодит бодогчийн жишээ сервер дээр бодогдсон
    await expect(page.locator("#solver").getByText("Шалгагдсан", { exact: true })).toBeVisible();
    await shot(page, "01-landing");
    await t.assertClean();
  });

  test("бүртгэл үүсгэх формын шалгалт", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Нэр").fill("Тест Сурагч");
    await page.getByLabel("Имэйл").fill(`pw${Date.now()}@test.mn`);
    await page.getByLabel("Нууц үг").fill("short");
    await page.getByRole("button", { name: "Бүртгүүлэх" }).click();
    await expect(page.getByText("Үйлчилгээний нөхцөл ба нууцлалын бодлогыг зөвшөөрнө үү.")).toBeVisible();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Бүртгүүлэх" }).click();
    await expect(page.getByText("Нууц үг хамгийн багадаа 8 тэмдэгт")).toBeVisible();
    await page.getByLabel("Нууц үг").fill("Secret1234");
    await page.getByRole("button", { name: "8", exact: true }).click();
    await page.getByRole("button", { name: "Бүртгүүлэх" }).click();
    await page.waitForURL(/\/student$/);
    await expect(page.getByText("Тест Сурагч", { exact: false }).first()).toBeVisible();
  });
});

test.describe("Сурагч", () => {
  test.beforeEach(async ({ page }) => login(page, "student"));

  test("хянах самбар бодит өгөгдөлтэй", async ({ page }) => {
    const t = trackErrors(page);
    await expect(page.getByText("Өдрийн зорилго").first()).toBeVisible();
    await expect(page.getByText("7 хоногийн идэвх")).toBeVisible();
    await expect(page.locator(".recharts-bar-rectangle").first()).toBeVisible();
    await shot(page, "02-student-dashboard");
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await shot(page, "03-student-dashboard-dark");
    await t.assertClean();
  });

  test("бодогч: жишээ сонгоод бодох", async ({ page }) => {
    const t = trackErrors(page);
    await page.goto("/student/solve");
    await page.locator("math-field").waitFor();
    await page.locator("button:has(.katex)").first().click(); // эхний жишээ: x^2-5x+6=0
    await page.getByRole("button", { name: "Бодох" }).click();
    await expect(page.getByText("Бодолтын алхмууд")).toBeVisible();
    await expect(page.getByText("Шалгагдсан").first()).toBeVisible();
    await expect(page.getByText("Үржигдэхүүнд задлах арга (Виетийн теорем)")).toBeVisible();
    await shot(page, "04-solver-result");
    await page.getByRole("button", { name: "Хадгалах" }).click();
    await expect(page.getByRole("button", { name: "Хадгалсан" })).toBeVisible();
    await t.assertClean();
  });

  test("бодогч: MathLive-д гараар бичих", async ({ page }) => {
    await page.goto("/student/solve");
    const mf = page.locator("math-field");
    await mf.waitFor();
    await mf.click();
    await page.keyboard.type("2x+3=11");
    await page.getByRole("button", { name: "Бодох" }).click();
    await expect(page.getByText("Шугаман тэгшитгэл").first()).toBeVisible();
    await expect(page.locator(".katex").filter({ hasText: "x=4" }).first()).toBeVisible();
  });

  test("бодогч: зураг оруулах → тайрах → (OCR-гүй) гараар засаж бодох", async ({ page }) => {
    const t = trackErrors(page);
    // Тестийн зураг: KaTeX-ээр рендерлэсэн бодлогын screenshot
    await page.setContent(`<div id="p" style="padding:40px;font:32px serif;background:#fff">3x − 7 = 11</div>`);
    const png = await page.locator("#p").screenshot();
    await page.goto("/student/solve?mode=image");
    await page.locator('input[type="file"]').setInputFiles({ name: "problem.png", mimeType: "image/png", buffer: png });
    await expect(page.getByText("Зургийг тохируулах")).toBeVisible();
    await page.getByRole("button", { name: "Баруун тийш эргүүлэх" }).click();
    await page.getByRole("button", { name: "Зүүн тийш эргүүлэх" }).click();
    await page.getByRole("button", { name: "Тодруулах" }).click();
    await shot(page, "05-solver-crop");
    await page.getByRole("button", { name: "Баталгаажуулах" }).click();
    await expect(page.getByText("Танигдсан бодлогыг шалгана уу")).toBeVisible({ timeout: 30_000 });
    // OCR тохируулаагүй тул анхааруулга гарч, гараар бичих боломжтой
    const solveBtn = page.getByRole("button", { name: "Баталгаажуулж бодох" });
    await expect(solveBtn).toBeDisabled();
    await page.getByPlaceholder(/Бодлогоо энд бичнэ үү/).fill("Тэгшитгэлийг бод: $3x - 7 = 11$");
    await expect(solveBtn).toBeDisabled(); // шалгасан гэж тэмдэглээгүй
    await page.getByText("Бодлогын нөхцөл эх зурагтай яг таарч байгааг шалгасан").click();
    await shot(page, "06-solver-review");
    await solveBtn.click();
    await expect(page.getByText("Бодолтын алхмууд")).toBeVisible();
    await expect(page.locator(".katex").filter({ hasText: "x=6" }).first()).toBeVisible();
    await t.assertClean();
  });

  test("суралцах → сэдэв → хичээл дуусгах", async ({ page }) => {
    const t = trackErrors(page);
    await page.goto("/student/learn?grade=9");
    await expect(page.getByText("Хөтөлбөрийн мэдээлэл")).toBeVisible();
    await shot(page, "07-learn");
    await page.getByRole("link", { name: /Квадрат язгуур ба иррационал тоо/ }).click();
    await expect(page.getByRole("heading", { name: "Квадрат язгуур ба иррационал тоо" })).toBeVisible();
    await page.getByRole("link", { name: /Квадрат язгуурын чанар/ }).first().click();
    await expect(page.locator(".math-prose .katex").first()).toBeVisible();
    await shot(page, "08-lesson");
    await page.getByRole("button", { name: "Хичээлийг дуусгасан гэж тэмдэглэх" }).click();
    await expect(page.getByText("Хичээлийг дуусгасан").first()).toBeVisible();
    await t.assertClean();
  });

  test("түгжээтэй сэдэв нээгдэхгүй", async ({ page }) => {
    await page.goto("/student/learn/topic/g12-integrals");
    await expect(page.getByText("Энэ сэдэв түгжээтэй байна")).toBeVisible();
  });

  test("дасгал: хариулж тайлбар харах", async ({ page }) => {
    const t = trackErrors(page);
    await page.goto("/student/practice?grade=6");
    await expect(page.getByText(/^1\/\d+$/)).toBeVisible();
    // Эхний бодлогын төрлөөс хамааран хариулах
    const mc = page.locator("button[aria-pressed]").filter({ has: page.locator("span", { hasText: /^[A-E]$/ }) });
    if (await mc.count()) await mc.first().click();
    else await page.getByLabel("Хариу").fill("0");
    await page.getByRole("button", { name: "Шалгах" }).click();
    await expect(page.getByText(/Зөв! \+10 XP|Буруу байна/)).toBeVisible();
    await shot(page, "09-practice-feedback");
    await page.getByRole("button", { name: /Дараагийн бодлого|Дүн харах/ }).click();
    await t.assertClean();
  });

  test("шалгалт: эхлүүлэх, хариулах, refresh, илгээх, дүн", async ({ page }) => {
    const t = trackErrors(page);
    await page.goto("/student/exams?grade=6");
    await page.getByRole("link", { name: /Эхлэх|Дахин өгөх/ }).first().click();
    await shot(page, "10-exam-intro");
    await page.getByRole("button", { name: /Шалгалт эхлүүлэх/ }).click();
    await page.waitForURL(/\/student\/exams\/attempt\//);
    await expect(page.getByRole("timer")).toBeVisible();
    // Эхний асуултад хариулах
    const opt = page.locator("button[aria-pressed]").filter({ has: page.locator("span", { hasText: /^[A-E]$/ }) });
    if (await opt.count()) await opt.first().click();
    else await page.getByLabel("Хариу").fill("12");
    await expect(page.getByText("Хадгалагдсан")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Дахин харах" }).click();
    await shot(page, "11-exam-running");
    // Санамсаргүй refresh — хариулт хадгалагдсан хэвээр
    await page.reload();
    await expect(page.getByText(/1\/\d+ хариулсан/)).toBeVisible();
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Шалгалт илгээх" }).click();
    await expect(page.getByText("Шалгалтаа илгээх үү?")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Илгээх" }).click();
    await page.waitForURL(/\/student\/exams\/result\//);
    await expect(page.getByText("Дэлгэрэнгүй бодолт")).toBeVisible();
    await shot(page, "12-exam-result");
    await t.assertClean();
  });

  test("ахиц, хадгалсан, профайл, AI багш хуудсууд", async ({ page }) => {
    const t = trackErrors(page);
    await page.goto("/student/progress");
    await expect(page.getByText("Амжилтууд")).toBeVisible();
    await shot(page, "13-progress");
    await page.goto("/student/tutor");
    await expect(page.getByText("AI багш тохируулагдаагүй байна")).toBeVisible();
    await shot(page, "14-tutor");
    await page.goto("/student/profile");
    await page.getByLabel("Нэр", { exact: true }).fill("Тэмүүлэн Б.");
    await page.getByRole("button", { name: "Хадгалах" }).click();
    await expect(page.getByText("Хадгаллаа")).toBeVisible();
    await t.assertClean();
  });
});
