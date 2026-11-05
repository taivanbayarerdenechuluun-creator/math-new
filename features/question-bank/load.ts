// Засварлагчид зориулж бодлогыг QuestionDraft хэлбэрт хөрвүүлэх, сэдвийн жагсаалт ачаалах.
import "server-only";
import { db, parseJson } from "@/lib/db";
import type { QuestionDraft, TopicOption } from "@/components/questions/draft";

export async function loadTopicOptions(): Promise<TopicOption[]> {
  const topics = await db.topic.findMany({
    include: { unit: { select: { gradeId: true, title: true, order: true } } },
    orderBy: [{ unit: { gradeId: "asc" } }, { unit: { order: "asc" } }, { order: "asc" }],
  });
  return topics.map((t) => ({ id: t.id, title: t.title, gradeId: t.unit.gradeId, unit: t.unit.title }));
}

export async function loadQuestionDraft(id: string) {
  const q = await db.question.findUnique({
    where: { id },
    include: {
      options: { orderBy: { order: "asc" } },
      solutions: { orderBy: { createdAt: "desc" } },
      source: true,
      author: { select: { name: true } },
      reviewer: { select: { name: true } },
      reviews: { include: { reviewer: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      originalFile: true,
      topic: { select: { title: true } },
      _count: { select: { examLinks: true } },
    },
  });
  if (!q) return null;
  const manual = q.solutions.find((s) => !s.isAiGenerated) ?? q.solutions[0];
  const draft: QuestionDraft = {
    gradeId: q.gradeId,
    topicId: q.topicId,
    type: q.type as QuestionDraft["type"],
    difficulty: q.difficulty,
    title: q.title ?? "",
    text: q.text,
    correctAnswer: q.type === "MULTIPLE_CHOICE" ? "" : (q.correctAnswer ?? ""),
    tolerance: q.tolerance != null ? String(q.tolerance) : "",
    explanation: q.explanation ?? "",
    relatedFormulas: parseJson<string[]>(q.relatedFormulas, []),
    tags: q.tags,
    sourceName: q.source?.name ?? "",
    options: q.options.length ? q.options.map((o) => ({ label: o.label, text: o.text, isCorrect: o.isCorrect })) : ["A", "B", "C", "D"].map((label) => ({ label, text: "", isCorrect: false })),
    solutionMethod: manual?.method ?? "",
    solutionSteps: manual ? parseJson<{ title: string; latex?: string; explanation: string }[]>(manual.steps, []).map((s) => ({ title: s.title ?? "", latex: s.latex ?? "", explanation: s.explanation ?? "" })) : [],
    originalFileId: q.originalFile?.purpose === "QUESTION_IMAGE" ? q.originalFileId : null,
  };
  return { q, draft };
}
