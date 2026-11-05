import Link from "next/link";
import { notFound } from "next/navigation";
import { AlarmClock, ArrowLeft, CheckCircle2, Clock, Flag, RefreshCw, Save, Target, Wifi } from "lucide-react";
import { requirePageRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { examIsOpen } from "@/features/examinations/server";
import { Alert, Badge, Card, CardBody } from "@/components/ui/primitives";
import { StartExamButton } from "./start-button";

export default async function ExamIntro({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(["STUDENT"]);
  const { id } = await params;
  const exam = await db.examination.findUnique({
    where: { id },
    include: { questions: { include: { question: { select: { type: true, topic: { select: { title: true } } } } } } },
  });
  if (!exam || !exam.isPublished) notFound();
  const state = examIsOpen(exam);
  const inProgress = await db.examinationAttempt.findFirst({ where: { examId: id, userId: user.id, status: "IN_PROGRESS" } });
  const topics = [...new Set(exam.questions.map((q) => q.question.topic?.title).filter(Boolean))] as string[];
  const hasOpen = exam.questions.some((q) => q.question.type === "OPEN");
  const totalPoints = exam.questions.reduce((s, q) => s + q.points, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/student/exams" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Шалгалтууд
      </Link>
      <Card className="overflow-hidden">
        <div className="bg-navy p-6 text-white sm:p-8">
          <Badge className="bg-white/10 text-white">{exam.gradeId}-р анги</Badge>
          <h1 className="mt-3 font-display text-2xl font-semibold">{exam.title}</h1>
          {exam.description && <p className="mt-2 text-white/70">{exam.description}</p>}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              [Clock, `${exam.durationMinutes} мин`, "Хугацаа"],
              [Target, `${exam.questions.length}`, "Асуулт"],
              [CheckCircle2, `${exam.passingScore}%`, "Тэнцэх босго"],
            ].map(([Icon, v, l], i) => {
              const I = Icon as typeof Clock;
              return (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
                  <I className="mx-auto h-5 w-5 text-[#8fe6f5]" />
                  <p className="mt-1.5 font-display text-lg font-semibold">{v as string}</p>
                  <p className="text-xs text-white/60">{l as string}</p>
                </div>
              );
            })}
          </div>
        </div>
        <CardBody className="space-y-5 sm:p-8">
          {topics.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Хамрах сэдвүүд</p>
              <div className="flex flex-wrap gap-2">
                {topics.map((t) => (
                  <Badge key={t} tone="neutral">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold">Дүрэм</p>
            <ul className="space-y-2 text-sm text-muted">
              <li className="flex gap-2"><AlarmClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Эхлүүлмэгц цаг явж эхэлнэ. Хугацаа дуусахад хариулт автоматаар илгээгдэнэ.</li>
              <li className="flex gap-2"><Save className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Хариулт бүр автоматаар хадгалагдана. Хуудсаа санамсаргүй шинэчилсэн ч үргэлжлүүлж болно.</li>
              <li className="flex gap-2"><Wifi className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Интернэт түр тасарвал хариулт төхөөрөмж дээр хадгалагдаж, холболт сэргэмэгц илгээгдэнэ.</li>
              <li className="flex gap-2"><Flag className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Эргэлзсэн асуултаа &quot;Дахин харах&quot; гэж тэмдэглэж болно.</li>
              <li className="flex gap-2"><RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Нийт оноо: {totalPoints}. Асуултын дараалал {exam.randomize ? "санамсаргүй" : "тогтмол"}.</li>
            </ul>
          </div>
          {hasOpen && <Alert tone="info">Энэ шалгалтад нээлттэй бодолттой асуулт байгаа тул тэдгээрийг багш шалгасны дараа эцсийн оноо гарна.</Alert>}
          {!state.open && !inProgress && <Alert tone="warning">{state.reason}</Alert>}
          <StartExamButton examId={exam.id} resumeId={inProgress?.id ?? null} disabled={!state.open && !inProgress} />
        </CardBody>
      </Card>
    </div>
  );
}
