import { requireApiRole } from "@/lib/auth";
import { ok, route } from "@/lib/api";
import { startAttempt } from "@/features/examinations/server";

export const POST = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireApiRole(["STUDENT"]);
  const { id } = await params;
  const attempt = await startAttempt(id, user.id);
  return ok({ attemptId: attempt.id });
});
