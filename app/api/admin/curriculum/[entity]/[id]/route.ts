import { HttpError, requireApiRole, STAFF } from "@/lib/auth";
import { ok, route } from "@/lib/api";
import { deleteEntity, updateEntity, type Entity } from "@/features/curriculum/server";

const ENTITIES: Entity[] = ["units", "topics", "lessons", "formulas", "prerequisites"];
type Ctx = { params: Promise<{ entity: string; id: string }> };

export const PUT = route<Ctx>(async (req, { params }) => {
  const user = await requireApiRole(STAFF);
  const { entity, id } = await params;
  if (!ENTITIES.includes(entity as Entity)) throw new HttpError(404, "Олдсонгүй.");
  return ok(await updateEntity(entity as Entity, id, await req.json(), user));
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const user = await requireApiRole(STAFF);
  const { entity, id } = await params;
  if (!ENTITIES.includes(entity as Entity)) throw new HttpError(404, "Олдсонгүй.");
  await deleteEntity(entity as Entity, id, user);
  return ok({ ok: true });
});
