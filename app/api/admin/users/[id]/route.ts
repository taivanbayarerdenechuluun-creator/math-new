import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, hashPassword, requireApiRole } from "@/lib/auth";
import { audit, ok, route } from "@/lib/api";
import { ROLES } from "@/lib/constants";

const schema = z.object({
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  grades: z.array(z.coerce.number().int().min(6).max(12)).max(7).optional(), // багшид хуваарилах ангиуд
  resetPassword: z.string().min(8).regex(/\d/).optional(),
});

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireApiRole(["ADMIN"]);
  const { id } = await params;
  const d = schema.parse(await req.json());
  const target = await db.user.findUnique({ where: { id } });
  if (!target) throw new HttpError(404, "Хэрэглэгч олдсонгүй.");
  if (id === admin.id && (d.role && d.role !== "ADMIN" || d.isActive === false)) throw new HttpError(400, "Өөрийн админ эрх эсвэл бүртгэлийг идэвхгүй болгох боломжгүй.");

  if (d.role || d.isActive !== undefined || d.resetPassword) {
    await db.user.update({
      where: { id },
      data: {
        ...(d.role ? { role: d.role, grade: d.role === "STUDENT" ? (target.grade ?? 9) : target.grade } : {}),
        ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
        ...(d.resetPassword ? { passwordHash: await hashPassword(d.resetPassword) } : {}),
      },
    });
  }
  if (d.grades) {
    await db.$transaction([
      db.teacherTopicAssignment.deleteMany({ where: { userId: id } }),
      ...d.grades.map((g) => db.teacherTopicAssignment.create({ data: { userId: id, gradeId: g } })),
    ]);
  }
  await audit(admin.id, d.role ? "ROLE_CHANGE" : "UPDATE", "user", id, { role: d.role, isActive: d.isActive, grades: d.grades, passwordReset: Boolean(d.resetPassword) });
  return ok({ ok: true });
});
