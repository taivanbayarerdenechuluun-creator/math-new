import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireApiRole } from "@/lib/auth";
import { ok, route } from "@/lib/api";
import { EXPLAIN_MODES } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };

async function own(id: string, userId: string) {
  const c = await db.aiConversation.findUnique({ where: { id } });
  if (!c || c.userId !== userId) throw new HttpError(404, "Яриа олдсонгүй.");
  return c;
}

export const GET = route<Ctx>(async (_req, { params }) => {
  const user = await requireApiRole();
  const { id } = await params;
  const c = await own(id, user.id);
  const messages = await db.aiMessage.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" }, select: { id: true, role: true, content: true, createdAt: true } });
  return ok({ conversation: c, messages });
});

const patch = z.object({ mode: z.enum(EXPLAIN_MODES).optional(), guided: z.boolean().optional(), title: z.string().trim().min(1).max(80).optional() });

export const PATCH = route<Ctx>(async (req, { params }) => {
  const user = await requireApiRole();
  const { id } = await params;
  await own(id, user.id);
  const c = await db.aiConversation.update({ where: { id }, data: patch.parse(await req.json()) });
  return ok(c);
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireApiRole();
  const { id } = await params;
  await own(id, user.id);
  await db.aiConversation.delete({ where: { id } });
  return ok({ ok: true });
});
