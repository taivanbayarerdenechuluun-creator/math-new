import { z } from "zod";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/auth";
import { ok, route } from "@/lib/api";

export const GET = route(async () => {
  const user = await requireApiRole();
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 });
  return ok({ items });
});

const patch = z.object({ id: z.string().optional(), all: z.boolean().optional() });

export const PATCH = route(async (req) => {
  const user = await requireApiRole();
  const { id, all } = patch.parse(await req.json());
  // userId нөхцөл нь бусдын мэдэгдлийг өөрчлөхөөс хамгаална
  if (all) await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  else if (id) await db.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } });
  return ok({ ok: true });
});
