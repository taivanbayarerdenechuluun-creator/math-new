import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireApiRole } from "@/lib/auth";
import { ok, route } from "@/lib/api";
import { deleteUpload } from "@/services/storage";

type Ctx = { params: Promise<{ id: string }> };

async function own(id: string, userId: string) {
  const p = await db.solvedProblem.findUnique({ where: { id }, include: { imageFile: { omit: { data: true } } } });
  if (!p || p.userId !== userId) throw new HttpError(404, "Бодлого олдсонгүй.");
  return p;
}

const patch = z.object({ isFavorite: z.boolean().optional(), feedback: z.enum(["HELPFUL", "NOT_HELPFUL"]).nullable().optional() });

export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireApiRole();
  const { id } = await params;
  await own(id, user.id);
  const data = patch.parse(await req.json());
  const updated = await db.solvedProblem.update({ where: { id }, data });
  return ok({ isFavorite: updated.isFavorite, feedback: updated.feedback });
});

/** Сурагч өөрийн түүхийг устгах эрхтэй — хавсаргасан зургийг хамт устгана */
export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireApiRole();
  const { id } = await params;
  const p = await own(id, user.id);
  await db.solvedProblem.delete({ where: { id } });
  if (p.imageFile) {
    const stillUsed = await db.solvedProblem.count({ where: { imageFileId: p.imageFile.id } });
    if (!stillUsed) {
      await deleteUpload(p.imageFile.path);
      await db.uploadedFile.delete({ where: { id: p.imageFile.id } }).catch(() => null);
    }
  }
  return ok({ ok: true });
});
