import { z } from "zod";
import { db } from "@/lib/db";
import { createSessionCookie, verifyPassword } from "@/lib/auth";
import { audit, clientIp, fail, ok, rateLimit, route } from "@/lib/api";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Имэйл хаяг буруу байна"),
  password: z.string().min(1, "Нууц үгээ оруулна уу").max(200),
});

export const POST = route(async (req) => {
  const ip = clientIp(req);
  rateLimit(`login:${ip}`, 10, 10 * 60_000);
  const { email, password } = schema.parse(await req.json());
  rateLimit(`login:${email}`, 8, 10 * 60_000);
  const user = await db.user.findUnique({ where: { email } });
  // Хэрэглэгч байгаа эсэхийг задруулахгүйн тулд ижил мессеж
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return fail(401, "Имэйл эсвэл нууц үг буруу байна.");
  }
  if (!user.isActive) return fail(403, "Таны бүртгэл түр хаагдсан байна. Админд хандана уу.");
  await createSessionCookie(user);
  await audit(user.id, "LOGIN", "user", user.id);
  return ok({ redirect: user.role === "STUDENT" ? "/student" : "/admin" });
});
