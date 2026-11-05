import { HttpError, requireApiRole, STAFF } from "@/lib/auth";
import { ok, route } from "@/lib/api";
import { createEntity, type Entity } from "@/features/curriculum/server";

const ENTITIES: Entity[] = ["units", "topics", "lessons", "formulas", "prerequisites"];

export const POST = route<{ params: Promise<{ entity: string }> }>(async (req, { params }) => {
  const user = await requireApiRole(STAFF);
  const { entity } = await params;
  if (!ENTITIES.includes(entity as Entity)) throw new HttpError(404, "Олдсонгүй.");
  const r = await createEntity(entity as Entity, await req.json(), user);
  return ok(r, { status: 201 });
});
