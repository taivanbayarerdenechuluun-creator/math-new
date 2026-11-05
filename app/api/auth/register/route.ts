import { z } from "zod";
import { db } from "@/lib/db";
import { createSessionCookie, hashPassword } from "@/lib/auth";
import { audit, clientIp, fail, ok, rateLimit, route } from "@/lib/api";

// Насанд хүрээгүй хэрэглэгчид олон тул зөвхөн зайлшгүй мэдээлэл цуглуулна: нэр, имэйл, анги.
const schema = z.object({
  name: z.string().trim().min(2, "Нэр хамгийн багадаа 2 тэмдэгт").max(60),
  email: z.string().trim().toLowerCase().email("Имэйл хаяг буруу байна").max(120),
  password: z
    .string()
    .min(8, "Нууц үг хамгийн багадаа 8 тэмдэгт")
    .max(100)
    .regex(/[A-Za-z]/, "Нууц үгэнд үсэг орсон байх ёстой")
    .regex(/\d/, "Нууц үгэнд тоо орсон байх ёстой"),
  grade: z.coerce.number().int().min(6).max(12),
});

export const POST = route(async (req) => {
  rateLimit(`register:${clientIp(req)}`, 5, 60 * 60_000);
  const data = schema.parse(await req.json());
  const exists = await db.user.findUnique({ where: { email: data.email } });
  if (exists) return fail(409, "Энэ имэйл хаягаар бүртгэл үүссэн байна.");
  // Бүртгэлээр зөвхөн СУРАГЧ үүснэ. Багш/админыг админ үүсгэнэ.
  const user = await db.user.create({
    data: { name: data.name, email: data.email, passwordHash: await hashPassword(data.password), grade: data.grade, role: "STUDENT" },
  });
  await db.notification.create({
    data: { userId: user.id, title: "IQ MATH-д тавтай морил!", body: "Өдрийн зорилгоо тавьж, анхны бодлогоо бодоорой.", link: "/student" },
  });
  await createSessionCookie(user);
  await audit(user.id, "REGISTER", "user", user.id);
  return ok({ redirect: "/student" }, { status: 201 });
});
