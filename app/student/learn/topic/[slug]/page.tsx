import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, CheckCircle2, Clock, Lock, PlayCircle, Sigma, Target } from "lucide-react";
import { requirePageRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { topicStats, unlockedTopicIds } from "@/features/progress/server";
import { Alert, Badge, Card, CardBody, CardHeader, EmptyState, LinkButton } from "@/components/ui/primitives";
import { Tex } from "@/components/mathematics/math-text";
import { cn } from "@/lib/utils";

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requirePageRole(["STUDENT"]);
  const { slug } = await params;
  const topic = await db.topic.findUnique({
    where: { slug },
    include: {
      unit: true,
      lessons: { where: { isPublished: true }, orderBy: { order: "asc" } },
      formulas: true,
      prerequisites: { include: { prerequisite: true } },
      _count: { select: { questions: { where: { status: "PUBLISHED" } } } },
    },
  });
  if (!topic) notFound();

  const [unlocked, done, stats] = await Promise.all([
    unlockedTopicIds(user.id, [topic.id]),
    db.learningProgress.findMany({ where: { userId: user.id }, select: { lessonId: true } }).then((r) => new Set(r.map((x) => x.lessonId))),
    topicStats(user.id),
  ]);
  const locked = !unlocked.has(topic.id);
  const mine = stats.find((s) => s.topicId === topic.id);

  return (
    <div className="space-y-6">
      <Link href={`/student/learn?grade=${topic.unit.gradeId}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> {topic.unit.gradeId}-р анги · {topic.unit.title}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{topic.title}</h1>
          <p className="mt-2 max-w-2xl text-muted">{topic.description}</p>
          {mine && (
            <div className="mt-3 flex gap-2">
              <Badge tone={mine.accuracy >= 75 ? "success" : mine.accuracy >= 50 ? "warning" : "danger"}>Таны нарийвчлал {mine.accuracy}%</Badge>
              <Badge tone="neutral">{mine.attempts} оролдлого</Badge>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/student/practice?topic=${topic.slug}`} variant="primary" className={cn(locked && "pointer-events-none opacity-50")} aria-disabled={locked}>
            <Target className="h-4 w-4" /> Дасгал ажиллах ({topic._count.questions})
          </LinkButton>
          <LinkButton href={`/student/tutor?topic=${encodeURIComponent(topic.title)}`} variant="outline">
            <Bot className="h-4 w-4" /> AI багшаас асуух
          </LinkButton>
        </div>
      </div>

      {locked && (
        <Alert tone="warning" icon={<Lock className="h-4 w-4 text-warning" />} title="Энэ сэдэв түгжээтэй байна">
          <p>Дараах суурь сэдвүүдийг эзэмшсний дараа нээгдэнэ (60%-иас дээш нарийвчлалтай 3+ дасгал, эсвэл бүх хичээлийг дуусгах):</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {topic.prerequisites.map((p) => (
              <Link key={p.id} href={`/student/learn/topic/${p.prerequisite.slug}`} className="rounded-lg bg-surface px-3 py-1.5 text-sm font-semibold text-fg hover:text-primary">
                {p.prerequisite.title} →
              </Link>
            ))}
          </div>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Хичээлүүд" icon={<PlayCircle className="h-4 w-4" />} />
          <CardBody className="pt-4">
            {topic.lessons.length === 0 ? (
              <EmptyState title="Хичээл хараахан нэмэгдээгүй" description="Багш нар энэ сэдвийн хичээлийг бэлтгэж байна. Одоохондоо дасгал ажиллаж эсвэл AI багшаас асууж болно." />
            ) : (
              <ol className="space-y-2">
                {topic.lessons.map((l, i) => {
                  const isDone = done.has(l.id);
                  return (
                    <li key={l.id}>
                      <Link
                        href={locked ? "#" : `/student/learn/lesson/${l.id}`}
                        className={cn("flex items-center gap-4 rounded-xl border border-border p-4 transition-colors", locked ? "cursor-not-allowed opacity-60" : "hover:border-primary/40 hover:bg-primary-soft/30")}
                        aria-disabled={locked}
                      >
                        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold", isDone ? "bg-success text-white" : "bg-surface-2 text-muted")}>
                          {isDone ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{l.title}</p>
                          {l.summary && <p className="truncate text-sm text-muted">{l.summary}</p>}
                        </div>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-subtle">
                          <Clock className="h-3.5 w-3.5" /> {l.durationMin} мин
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Томьёоны сан" icon={<Sigma className="h-4 w-4" />} />
          <CardBody className="space-y-2 pt-4">
            {topic.formulas.length === 0 ? (
              <p className="text-sm text-muted">Томьёо нэмэгдээгүй байна.</p>
            ) : (
              topic.formulas.map((f) => (
                <div key={f.id} className="rounded-xl bg-surface-2/60 px-3.5 py-3">
                  <p className="text-xs font-medium text-muted">{f.title}</p>
                  <Tex tex={f.latex} display className="block overflow-x-auto" />
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
