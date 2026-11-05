import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { ok, route } from "@/lib/api";
import { EXPLAIN_MODES } from "@/lib/constants";

export const GET = route(async () => {
  const user = await requireApiRole();
  const items = await db.aiConversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, mode: true, guided: true, updatedAt: true },
  });
  return ok({ items });
});

const schema = z.object({ mode: z.enum(EXPLAIN_MODES).default("STANDARD"), guided: z.boolean().default(false), title: z.string().max(80).optional() });

export const POST = route(async (req) => {
  const user = await requireApiRole();
  const data = schema.parse(await req.json().catch(() => ({})));
  const c = await db.aiConversation.create({ data: { userId: user.id, mode: data.mode, guided: data.guided, title: data.title || "Шинэ яриа" } });
  return ok(c, { status: 201 });
});
