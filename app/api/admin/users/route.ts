import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, requireApiRole } from "@/lib/auth";
import { audit, fail, ok, route } from "@/lib/api";
import { ROLES } from "@/lib/constants";

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email("Имэйл буруу"),
  password: z.string().min(8, "Нууц үг хамгийн багадаа 8 тэмдэгт").regex(/[A-Za-z]/).regex(/\d/, "Нууц үгэнд тоо орсон байх ёстой"),
  role: z.enum(ROLES),
  grade: z.coerce.number().int().min(6).max(12).nullable().optional(),
});

/** Зөвхөн АДМИН хэрэглэгч (багш, админ) үүсгэнэ */
export const POST = route(async (req) => {
  const admin = await requireApiRole(["ADMIN"]);
  const d = schema.parse(await req.json());
  if (await db.user.findUnique({ where: { email: d.email } })) return fail(409, "Энэ имэйлээр бүртгэл бий.");
  const u = await db.user.create({
    data: { name: d.name, email: d.email, role: d.role, grade: d.role === "STUDENT" ? (d.grade ?? 9) : null, passwordHash: await hashPassword(d.password) },
  });
  await audit(admin.id, "CREATE", "user", u.id, { role: d.role });
  return ok({ id: u.id }, { status: 201 });
});
