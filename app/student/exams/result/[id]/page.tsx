import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Hourglass, MinusCircle, Target, XCircle } from "lucide-react";
import { requirePageRole } from "@/lib/auth";
import { attemptResult } from "@/features/examinations/server";
import { HttpError } from "@/lib/auth";
import { Alert, Badge, Card, CardBody, CardHeader, LinkButton, StatCard } from "@/components/ui/primitives";
import { HorizontalBars, RingProgress } from "@/components/analytics/charts";
import { ResultAnswers } from "@/components/examination/result-answers";
import { DIFFICULTY_LABELS } from "@/lib/constants";
import { pct } from "@/lib/utils";

export const metadata = { title: "Шалгалтын дүн" };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(["STUDENT"]);
  const { id } = await params;
  let data;
  try {
    data = await attemptResult(id, user.id);
  } catch (e) {
    if (e instanceof HttpError) notFound();
    throw e;
  }
  const { attempt, summary, byTopic, byDifficulty, answers } = data;
  const mins = Math.floor(summary.timeSpentSec / 60);
  const review = byTopic.filter((t) => t.total > 0 && t.correct / t.total < 0.7);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/student/exams" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Шалгалтууд
      </Link>
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[auto_1fr] md:items-center">
          <RingProgress value={attempt.percentage ?? 0} size={150} stroke={12} label="оноо" />
          <div>
            <div className="flex flex-wrap gap-2">
              {summary.passed ? <Badge tone="success">Тэнцсэн</Badge> : <Badge tone="danger">Тэнцээгүй</Badge>}
              {attempt.status === "AUTO_SUBMITTED" && <Badge tone="warning">Хугацаа дуусаж автоматаар илгээгдсэн</Badge>}
            </div>
            <h1 className="mt-3 font-display text-2xl font-semibold">{attempt.exam.title}</h1>
            <p className="mt-1 text-muted">
              Нийт оноо: <b className="text-fg">{attempt.score}</b> / {attempt.maxScore} · Тэнцэх босго {attempt.exam.passingScore}%
            </p>
            {attempt.pendingReview && (
              <Alert tone="info" className="mt-3">
                Нээлттэй бодлогыг багш шалгаж байна. Эцсийн оноо өөрчлөгдөж болно.
              </Alert>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Зөв" value={summary.correct} icon={<CheckCircle2 className="h-4 w-4" />} tone="success" />
        <StatCard label="Буруу" value={summary.incorrect} icon={<XCircle className="h-4 w-4" />} tone="danger" />
        <StatCard label="Хариулаагүй" value={summary.unanswered} icon={<MinusCircle className="h-4 w-4" />} tone="neutral" />
        <StatCard label="Зарцуулсан хугацаа" value={`${mins}:${String(summary.timeSpentSec % 60).padStart(2, "0")}`} sub="мин:сек" icon={<Clock className="h-4 w-4" />} tone="info" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Сэдвээр" icon={<Target className="h-4 w-4" />} />
          <CardBody>
            <HorizontalBars data={byTopic.map((t) => ({ label: t.title, value: pct(t.correct, t.total), sub: `${t.correct}/${t.total}` }))} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Хүндрэлийн түвшнээр" icon={<Hourglass className="h-4 w-4" />} />
          <CardBody>
            <HorizontalBars data={byDifficulty.map((d) => ({ label: DIFFICULTY_LABELS[d.difficulty], value: pct(d.correct, d.total), sub: `${d.correct}/${d.total}` }))} />
          </CardBody>
        </Card>
      </div>

      {review.length > 0 && (
        <Card>
          <CardHeader title="Давтах шаардлагатай сэдвүүд" description="70%-иас доош гүйцэтгэлтэй" />
          <CardBody className="flex flex-wrap gap-2">
            {review.map((t) =>
              t.slug ? (
                <LinkButton key={t.title} href={`/student/learn/topic/${t.slug}`} variant="outline" size="sm">
                  {t.title} →
                </LinkButton>
              ) : (
                <Badge key={t.title}>{t.title}</Badge>
              ),
            )}
          </CardBody>
        </Card>
      )}

      {attempt.exam.showSolutions && <ResultAnswers answers={JSON.parse(JSON.stringify(answers))} />}
    </div>
  );
}
