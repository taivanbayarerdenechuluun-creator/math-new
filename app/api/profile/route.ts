import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireApiRole, verifyPassword, hashPassword } from "@/lib/auth";
import { audit, ok, rateLimit, route } from "@/lib/api";
import { EXPLAIN_MODES } from "@/lib/constants";

const schema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  grade: z.coerce.number().int().min(6).max(12).optional(),
  dailyGoal: z.coerce.number().int().min(1).max(50).optional(),
  explainMode: z.enum(EXPLAIN_MODES).optional(),
  avatarColor: z.enum(["violet", "indigo", "cyan", "emerald", "amber", "rose"]).optional(),
  showOnLeaderboard: z.boolean().optional(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, "Шинэ нууц үг хамгийн багадаа 8 тэмдэгт")
    .regex(/[A-Za-z]/, "Нууц үгэнд үсэг орсон байх ёстой")
    .regex(/\d/, "Нууц үгэнд тоо орсон байх ёстой")
    .optional(),
});

export const PATCH = route(async (req) => {
  const user = await requireApiRole();
  const { currentPassword, newPassword, grade, ...rest } = schema.parse(await req.json());
  const data: Record<string, unknown> = { ...rest };
  if (grade !== undefined && user.role === "STUDENT") data.grade = grade;
  if (newPassword) {
    rateLimit(`pw:${user.id}`, 5, 60 * 60_000);
    const full = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!currentPassword || !(await verifyPassword(currentPassword, full.passwordHash))) throw new HttpError(400, "Одоогийн нууц үг буруу байна.");
    data.passwordHash = await hashPassword(newPassword);
    await audit(user.id, "PASSWORD_CHANGE", "user", user.id);
  }
  await db.user.update({ where: { id: user.id }, data });
  return ok({ ok: true });
});

/** Сурагч өөрийн бүртгэл ба бүх өгөгдлийг устгах (насанд хүрээгүй хэрэглэгчийн нууцлал) */
export const DELETE = route(async (req) => {
  const user = await requireApiRole(["STUDENT"]);
  const { password } = z.object({ password: z.string() }).parse(await req.json());
  const full = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(password, full.passwordHash))) throw new HttpError(400, "Нууц үг буруу байна.");
  await audit(null, "ACCOUNT_DELETE", "user", user.id);
  await db.user.delete({ where: { id: user.id } });
  const { clearSessionCookie } = await import("@/lib/auth");
  await clearSessionCookie();
  return ok({ redirect: "/" });
});
