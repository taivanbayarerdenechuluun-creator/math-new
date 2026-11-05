import { z } from "zod";
import { requireApiRole, STAFF } from "@/lib/auth";
import { ok, route } from "@/lib/api";
import { changeQuestionStatus } from "@/features/question-bank/server";
import { QUESTION_STATUSES } from "@/lib/constants";

const schema = z.object({ to: z.enum(QUESTION_STATUSES), comment: z.string().max(1000).optional() });

export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireApiRole(STAFF);
  const { id } = await params;
  const { to, comment } = schema.parse(await req.json());
  const q = await changeQuestionStatus(id, to, user, comment);
  return ok({ status: q.status });
});
