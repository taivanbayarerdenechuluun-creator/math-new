import { expect, test } from "@playwright/test";
import { login, shot, trackErrors } from "./helpers";

test.describe("Багш ба админ", () => {
  test("багш бодлого үүсгэж хянуулахаар илгээнэ, админ баталгаажуулж нийтэлнэ", async ({ page, browser }) => {
    const t = trackErrors(page);
    await login(page, "teacher");
    await shot(page, "20-admin-dashboard");
    await page.goto("/admin/questions/new");
    await page.getByRole("button", { name: "Тоон хариулттай" }).click();
    const text = `Бод: $9 \\cdot 7 - ${Date.now() % 100}$`;
    await page.getByPlaceholder(/Бодлогын нөхцөл/).fill(text);
    await expect(page.locator(".math-prose .katex").first()).toBeVisible();
    await page.getByPlaceholder("12 эсвэл 3/4 эсвэл 2; 3").fill(String(63 - (Date.now() % 100)));
    await page.getByRole("button", { name: "Хариуг тооцооллоор шалгах" }).click();
    await expect(page.getByText(/таарч байна|таарахгүй/)).toBeVisible();
    await shot(page, "21-question-editor");
    await page.getByRole("button", { name: "Хянуулахаар илгээх" }).click();
    await page.waitForURL(/\/admin\/questions\/[a-z0-9]{20,}$/);
    const url = page.url();
    await expect(page.getByText("Баталгаажуулалт хүлээж байна", { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Баталгаажуулах" })).toBeDisabled(); // өөрийнхөө бодлого
    await t.assertClean();

    const ctx = await browser.newContext({ channel: "chrome" } as never);
    const admin = await ctx.newPage();
    await login(admin, "admin");
    await admin.goto(url);
    await admin.getByRole("button", { name: "Баталгаажуулах" }).click();
    await expect(admin.getByRole("button", { name: "Нийтлэх" })).toBeVisible();
    await admin.getByRole("button", { name: "Нийтлэх" }).click();
    await expect(admin.getByText("Нийтлэгдсэн").first()).toBeVisible();
    await ctx.close();
  });

  test("хянах дараалал ба хуваагдсан дэлгэц", async ({ page }) => {
    const t = trackErrors(page);
    await login(page, "teacher2");
    await page.goto("/admin/review");
    await page.getByRole("link").filter({ hasText: "IQM-" }).first().click();
    await expect(page.getByText("OCR-ийн анхны текст (өөрчлөгдөөгүй)")).toBeVisible();
    await shot(page, "22-verification-split");
    await page.getByRole("button", { name: "Баталгаажуулах" }).click();
    await expect(page.getByRole("button", { name: "Нийтлэх" })).toBeVisible();
    await t.assertClean();
  });

  test("бөөн импорт: загвар → урьдчилан харах → импорт", async ({ page }) => {
    const t = trackErrors(page);
    await login(page, "teacher");
    await page.goto("/admin/import");
    await page.getByRole("tab", { name: /CSV/ }).click();
    const csv = `grade,topic,type,difficulty,text,optionA,optionB,optionC,optionD,optionE,correct,tolerance,explanation,tags,source\n7,g7-linear-equations,NUMERIC,1,"PW: $5x = ${Date.now() % 1000 * 5}$",,,,,,${Date.now() % 1000},,,pw,PW\n7,nope,NUMERIC,1,"муу мөр",,,,,,,,,,\n`;
    await page.locator('input[type="file"]').setInputFiles({ name: "pw.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(page.getByText(/2 мөр · 1 зөв · 1 алдаатай/)).toBeVisible();
    await shot(page, "23-bulk-preview");
    await page.getByRole("button", { name: "1 мөр импортлох" }).click();
    await expect(page.getByText(/1 амжилттай · 1 алдаатай/)).toBeVisible();
    await t.assertClean();
  });

  test("шалгалт үүсгэх: автомат сонголт", async ({ page }) => {
    const t = trackErrors(page);
    await login(page, "teacher");
    await page.goto("/admin/exams/new");
    await page.getByRole("textbox").first().fill("Playwright шалгалт");
    await page.getByRole("button", { name: "Сонгох" }).click();
    await expect(page.getByText(/Сонгосон асуултууд \([1-9]/)).toBeVisible();
    await shot(page, "24-exam-builder");
    await page.getByRole("button", { name: "Хадгалах" }).click();
    await page.waitForURL(/\/admin\/exams\/[a-z0-9]{20,}$/);
    await t.assertClean();
  });

  test("хөтөлбөр ба админы хуудсууд", async ({ page }) => {
    const t = trackErrors(page);
    await login(page, "admin");
    for (const [path, text, name] of [
      ["/admin/curriculum?grade=9", "Сургалтын хөтөлбөр", "25-curriculum"],
      ["/admin/questions", "Бодлогын сан", "26-question-bank"],
      ["/admin/users", "Хэрэглэгчид", "27-users"],
      ["/admin/analytics", "Шинжилгээ", "28-analytics"],
      ["/admin/students", "Сурагчдын гүйцэтгэл", "29-students"],
      ["/admin/audit", "Аудит лог", "30-audit"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: text, level: 1 })).toBeVisible();
      await shot(page, name);
    }
    await page.goto("/admin/curriculum?grade=9");
    await page.getByRole("button", { name: /Квадрат тэгшитгэл/ }).first().click();
    await expect(page.getByText("Урьдчилсан нөхцөл (эзэмшсний дараа нээгдэнэ)")).toBeVisible();
    await t.assertClean();
  });
});
