import "server-only";
import { db } from "@/lib/db";

export interface PickableQuestion {
  id: string;
  code: string;
  text: string;
  type: string;
  difficulty: number;
  gradeId: number;
  topicId: string | null;
  topic: string | null;
}

export async function loadPublishedQuestions(): Promise<PickableQuestion[]> {
  const qs = await db.question.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, code: true, text: true, type: true, difficulty: true, gradeId: true, topicId: true, topic: { select: { title: true } } },
    orderBy: [{ gradeId: "asc" }, { difficulty: "asc" }],
  });
  return qs.map((q) => ({ ...q, topic: q.topic?.title ?? null }));
}
