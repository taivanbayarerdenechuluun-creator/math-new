import { expect, test } from "@playwright/test";
import { login, shot, trackErrors } from "./helpers";

test.describe("Гар утас", () => {
  test("хэвтээ гүйлгээгүй, доод цэс, камерын fallback", async ({ page }) => {
    const t = trackErrors(page);
    await page.goto("/");
    await shot(page, "m01-landing");
    // Гар утасны эмуляцид layout viewport контентоор сунадаг тул төхөөрөмжийн жинхэнэ өргөнтэй харьцуулна.
    // Зориуд хэвтээ гүйлгэдэг контейнер (overflow-x: auto/scroll) доторх элементийг тооцохгүй.
    const vw = page.viewportSize()!.width;
    const overflowOf = () =>
      page.evaluate(() => {
        const scrollable = (el: Element | null): boolean => {
          for (let p = el?.parentElement; p; p = p.parentElement) {
            const ox = getComputedStyle(p).overflowX;
            if (ox === "auto" || ox === "scroll" || ox === "hidden") return true;
          }
          return false;
        };
        let max = document.documentElement.scrollWidth;
        for (const e of document.querySelectorAll("body *")) {
          const r = e.getBoundingClientRect();
          if (r.width > 0 && getComputedStyle(e).position !== "fixed" && !scrollable(e)) max = Math.max(max, r.right);
        }
        return max;
      });
    expect(await overflowOf()).toBeLessThanOrEqual(vw + 1);

    await login(page, "student");
    await expect(page.getByRole("navigation", { name: "Доод цэс" })).toBeVisible();
    await shot(page, "m02-dashboard");
    for (const p of ["/student", "/student/learn", "/student/solve", "/student/exams", "/student/progress", "/student/practice?grade=9"]) {
      await page.goto(p);
      expect(await overflowOf(), `${p} хэвтээ гүйлгээтэй`).toBeLessThanOrEqual(vw + 1);
    }
    await page.goto("/student/solve?mode=camera");
    await expect(page.getByRole("button", { name: /Камер асаах/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Зураг сонгох \/ авах/ })).toBeVisible();
    await shot(page, "m03-camera");
    await page.getByRole("button", { name: "Бусад" }).click();
    await expect(page.getByRole("link", { name: "Миний ахиц" })).toBeVisible();
    await shot(page, "m04-drawer");
    await t.assertClean();
  });

  test("гар утсан дээр шалгалтын асуултын жагсаалт", async ({ page }) => {
    await login(page, "student");
    await page.goto("/student/exams?grade=8");
    await page.getByRole("link", { name: /Эхлэх|Дахин өгөх|Үргэлжлүүлэх/ }).first().click();
    await page.waitForURL(/\/student\/exams\/(attempt\/)?[a-z0-9]{20,}$/);
    if (!page.url().includes("attempt")) await page.getByRole("button", { name: /Шалгалт эхлүүлэх|Шалгалтаа үргэлжлүүлэх/ }).click();
    await page.waitForURL(/attempt/);
    await page.getByRole("button", { name: "Асуултын жагсаалт" }).click();
    await expect(page.getByRole("button", { name: /^3-р асуулт/ })).toBeVisible();
    await shot(page, "m05-exam-grid");
  });
});
