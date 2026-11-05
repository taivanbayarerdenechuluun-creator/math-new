import Link from "next/link";
import { ArrowRight, ListChecks, ScanText, Sparkles } from "lucide-react";
import { requirePageRole, STAFF } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { MathText } from "@/components/mathematics/math-text";
import { QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Хянах дараалал" };

export default async function ReviewQueue() {
  const user = await requirePageRole(STAFF);
  const assignments = user.role === "TEACHER" ? await db.teacherTopicAssignment.findMany({ where: { userId: user.id } }) : [];
  const items = await db.question.findMany({
    where: { status: "NEEDS_REVIEW", ...(assignments.length ? { gradeId: { in: assignments.map((a) => a.gradeId) } } : {}) },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true, id: true } }, topic: { select: { title: true } }, importJob: { select: { type: true, fileName: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Чанарын хяналт"
        title="Хянах дараалал"
        description="Баталгаажуулалт хүлээж буй бодлогууд. Зөвхөн баталгаажсан бодлого нийтлэгдэж, шалгалтад орно."
      />
      {items.length === 0 ? (
        <EmptyState icon={<ListChecks className="h-6 w-6" />} title="Дараалал хоосон байна 🎉" description="Хянах шаардлагатай бодлого алга." />
      ) : (
        <div className="space-y-3">
          {items.map((q) => {
            const own = q.author?.id === user.id && user.role !== "ADMIN";
            return (
              <Link key={q.id} href={`/admin/questions/${q.id}`}>
                <Card className="flex items-center gap-4 p-4 transition-colors hover:border-primary/40">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">{q.code}</span>
                      <Badge tone="neutral">{q.gradeId}-р анги</Badge>
                      <Badge tone="neutral">{QUESTION_TYPE_LABELS[q.type as QuestionType]}</Badge>
                      {q.importJob && (
                        <Badge tone="info">
                          <ScanText className="h-3 w-3" /> {q.importJob.type} импорт
                        </Badge>
                      )}
                      {q.aiGenerated && (
                        <Badge tone="warning">
                          <Sparkles className="h-3 w-3" /> AI санал
                        </Badge>
                      )}
                      {q.ocrConfidence != null && q.ocrConfidence < 0.8 && <Badge tone="danger">Бага итгэлтэй OCR</Badge>}
                      {own && <Badge tone="neutral">Таны бодлого — өөр хүн хянана</Badge>}
                    </div>
                    <div className="line-clamp-2 text-sm">
                      <MathText text={q.text} inline />
                    </div>
                    <p className="mt-1 text-xs text-subtle">
                      {q.author?.name ?? "—"} · {q.topic?.title ?? "Сэдэвгүй"} · {formatDateTime(q.createdAt)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-subtle" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
