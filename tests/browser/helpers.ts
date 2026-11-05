import { expect, type Page } from "@playwright/test";

export const USERS = {
  student: ["student@iqmath.mn", "Student123!"],
  teacher: ["teacher@iqmath.mn", "Teacher123!"],
  teacher2: ["teacher2@iqmath.mn", "Teacher123!"],
  admin: ["admin@iqmath.mn", "Admin123!"],
} as const;

export async function login(page: Page, who: keyof typeof USERS) {
  const [email, password] = USERS[who];
  await page.goto("/login");
  await page.getByLabel("Имэйл").fill(email);
  await page.getByLabel("Нууц үг", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Нэвтрэх" }).click();
  await page.waitForURL(who === "student" ? /\/student$/ : /\/admin$/);
}

/** Хуудсанд серверийн/клиентийн алдаа гараагүйг баталгаажуулах */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource: the server responded with a status of (401|404|503)/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return {
    assertClean: async () => {
      await expect(page.getByText("Алдаа гарлаа", { exact: true })).toHaveCount(0);
      expect(errors, errors.join("\n")).toEqual([]);
    },
  };
}

export async function shot(page: Page, name: string) {
  await page.waitForTimeout(400); // анимаци дуусах
  await page.screenshot({ path: `tests/browser/screenshots/${name}.png`, fullPage: true });
}
