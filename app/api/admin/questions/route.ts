import { requireApiRole, STAFF } from "@/lib/auth";
import { ok, route } from "@/lib/api";
import { questionInputSchema } from "@/features/question-bank/schema";
import { createQuestion } from "@/features/question-bank/server";

export const POST = route(async (req) => {
  const user = await requireApiRole(STAFF);
  const body = await req.json();
  const input = questionInputSchema.parse(body);
  const submit = body.submitForReview === true;
  const q = await createQuestion(input, user, { status: submit ? "NEEDS_REVIEW" : "DRAFT" });
  return ok({ id: q.id, code: q.code }, { status: 201 });
});
