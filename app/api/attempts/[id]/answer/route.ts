import { z } from "zod";
import { requireApiRole } from "@/lib/auth";
import { ok, route } from "@/lib/api";
import { saveAnswer } from "@/features/examinations/server";

const schema = z.object({
  questionId: z.string(),
  answer: z.string().max(2000).nullable(),
  marked: z.boolean().default(false),
});

export const PUT = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireApiRole(["STUDENT"]);
  const { id } = await params;
  const { questionId, answer, marked } = schema.parse(await req.json());
  await saveAnswer(id, user.id, questionId, answer, marked);
  return ok({ saved: true, serverTime: Date.now() });
});
