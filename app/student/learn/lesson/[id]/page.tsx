import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Bot, Clock, Lightbulb, Lock, Target } from "lucide-react";
import { requirePageRole } from "@/lib/auth";
import { db, parseJson } from "@/lib/db";
import { unlockedTopicIds } from "@/features/progress/server";
import { Alert, Badge, Card, CardBody, CardHeader, LinkButton } from "@/components/ui/primitives";
import { MathText, Tex } from "@/components/mathematics/math-text";
import { CompleteLessonButton } from "./complete-button";
import { ExampleReveal } from "./example-reveal";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(["STUDENT"]);
  const { id } = await params;
  const lesson = await db.lesson.findUnique({
    where: { id },
    include: { topic: { include: { unit: true, formulas: true, lessons: { where: { isPublished: true }, orderBy: { order: "asc" }, select: { id: true, title: true } } } } },
  });
  if (!lesson || !lesson.isPublished) notFound();

  const [unlocked, progress] = await Promise.all([
    unlockedTopicIds(user.id, [lesson.topicId]),
    db.learningProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId: id } } }),
  ]);
  const locked = !unlocked.has(lesson.topicId) && !progress;
  const idx = lesson.topic.lessons.findIndex((l) => l.id === id);
  const next = lesson.topic.lessons[idx + 1];
  const examples = parseJson<{ problem: string; solution: string }[]>(lesson.examples, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href={`/student/learn/topic/${lesson.topic.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> {lesson.topic.title}
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{lesson.topic.unit.gradeId}-р анги</Badge>
          <Badge tone="neutral">
            <Clock className="h-3 w-3" /> {lesson.durationMin} минут
          </Badge>
          {lesson.isEnrichment && <Badge tone="accent">Нэмэлт агуулга</Badge>}
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">{lesson.title}</h1>
        {lesson.summary && <p className="mt-2 text-muted">{lesson.summary}</p>}
      </header>

      {locked ? (
        <Alert tone="warning" icon={<Lock className="h-4 w-4 text-warning" />} title="Энэ хичээл түгжээтэй">
          Эхлээд суурь сэдвүүдээ эзэмшээрэй.{" "}
          <Link href={`/student/learn/topic/${lesson.topic.slug}`} className="font-semibold text-primary underline">
            Дэлгэрэнгүй
          </Link>
        </Alert>
      ) : (
        <>
          <Card>
            <CardBody className="sm:p-8">
              <MathText text={lesson.content} className="text-[1.02rem]" />
            </CardBody>
          </Card>

          {examples.length > 0 && (
            <Card>
              <CardHeader title="Жишээ бодлогууд" description="Эхлээд өөрөө бодоод дараа нь хариуг шалгаарай" icon={<Lightbulb className="h-4 w-4" />} />
              <CardBody className="space-y-3">
                {examples.map((ex, i) => (
                  <ExampleReveal key={i} n={i + 1} problem={ex.problem} solution={ex.solution} />
                ))}
              </CardBody>
            </Card>
          )}

          {lesson.topic.formulas.length > 0 && (
            <Card>
              <CardHeader title="Энэ сэдвийн томьёо" />
              <CardBody className="grid gap-2 sm:grid-cols-2">
                {lesson.topic.formulas.map((f) => (
                  <div key={f.id} className="rounded-xl bg-surface-2/60 px-4 py-3">
                    <p className="text-xs font-medium text-muted">{f.title}</p>
                    <Tex tex={f.latex} display className="block overflow-x-auto" />
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
            <CompleteLessonButton lessonId={id} completed={Boolean(progress)} />
            <div className="flex flex-wrap gap-2">
              <LinkButton href={`/student/tutor?topic=${encodeURIComponent(lesson.title)}`} variant="ghost">
                <Bot className="h-4 w-4" /> Ойлгоогүй зүйл асуух
              </LinkButton>
              <LinkButton href={`/student/practice?topic=${lesson.topic.slug}`} variant="outline">
                <Target className="h-4 w-4" /> Дасгал
              </LinkButton>
              {next && (
                <LinkButton href={`/student/learn/lesson/${next.id}`}>
                  Дараагийн хичээл <ArrowRight className="h-4 w-4" />
                </LinkButton>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
