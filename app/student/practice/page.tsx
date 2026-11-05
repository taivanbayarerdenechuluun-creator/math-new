import Link from "next/link";
import { Target } from "lucide-react";
import { requirePageRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { unlockedTopicIds } from "@/features/progress/server";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui/primitives";
import { DIFFICULTY_LABELS, GRADES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { PracticeClient, type PracticeQuestion } from "./practice-client";

export const metadata = { title: "Дасгал" };

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ topic?: string; grade?: string; difficulty?: string }> }) {
  const user = await requirePageRole(["STUDENT"]);
  const sp = await searchParams;
  const topic = sp.topic ? await db.topic.findUnique({ where: { slug: sp.topic }, include: { unit: true } }) : null;
  const grade = topic?.unit.gradeId ?? (Number(sp.grade) || user.grade || 9);
  const difficulty = Number(sp.difficulty) || undefined;

  const locked = topic ? !(await unlockedTopicIds(user.id, [topic.id])).has(topic.id) : false;

  const questions = locked
    ? []
    : await db.question.findMany({
        where: {
          status: "PUBLISHED",
          type: { not: "OPEN" },
          gradeId: grade,
          ...(topic ? { topicId: topic.id } : {}),
          ...(difficulty ? { difficulty } : {}),
        },
        include: {
          options: { orderBy: { order: "asc" }, select: { label: true, text: true } },
          topic: { select: { title: true } },
          practice: { where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 1, select: { isCorrect: true } },
          saved: { where: { userId: user.id }, select: { id: true } },
        },
        take: 60,
      });

  // Дасан зохицох дараалал: шийдээгүй → буруу бодсон → зөв бодсон; тус бүрт хялбараас хүнд рүү
  const rank = (q: (typeof questions)[number]) => (q.practice.length === 0 ? 0 : q.practice[0].isCorrect ? 2 : 1);
  const ordered = [...questions].sort((a, b) => rank(a) - rank(b) || a.difficulty - b.difficulty).slice(0, 20);
  // Зөв хариуг клиент рүү ИЛГЭЭХГҮЙ — серверт шалгана
  const payload: PracticeQuestion[] = ordered.map((q) => ({
    id: q.id,
    code: q.code,
    text: q.text,
    type: q.type as PracticeQuestion["type"],
    difficulty: q.difficulty,
    options: q.options,
    topic: q.topic?.title ?? null,
    saved: q.saved.length > 0,
    lastResult: q.practice[0]?.isCorrect ?? null,
  }));

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { topic: sp.topic, grade: topic ? undefined : String(grade), difficulty: sp.difficulty, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    return `/student/practice?${p.toString()}`;
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Бодлогын сан"
        title={topic ? `Дасгал: ${topic.title}` : "Дасгал ажиллах"}
        description="Багш нарын шалгаж баталгаажуулсан бодлогууд. Хариугаа оруулаад тайлбартай шалгуулаарай."
      />
      <div className="mb-5 flex flex-col gap-3">
        {!topic && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {GRADES.map((g) => (
              <Link key={g} href={`/student/practice?grade=${g}`} className={cn("h-9 shrink-0 rounded-lg border px-3 text-sm font-semibold leading-9", g === grade ? "border-primary bg-primary text-white" : "border-border bg-surface text-muted hover:text-fg")}>
                {g}-р анги
              </Link>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          <Link href={qs({ difficulty: undefined })} className={cn("h-8 rounded-lg px-3 text-xs font-semibold leading-8", !difficulty ? "bg-fg text-bg" : "bg-surface-2 text-muted hover:text-fg")}>
            Бүх түвшин
          </Link>
          {[1, 2, 3, 4, 5].map((d) => (
            <Link key={d} href={qs({ difficulty: String(d) })} className={cn("h-8 rounded-lg px-3 text-xs font-semibold leading-8", difficulty === d ? "bg-fg text-bg" : "bg-surface-2 text-muted hover:text-fg")}>
              {DIFFICULTY_LABELS[d]}
            </Link>
          ))}
          {topic && (
            <Link href={`/student/practice?grade=${grade}`} className="h-8 rounded-lg px-3 text-xs font-semibold leading-8 text-primary hover:underline">
              Сэдвийн шүүлтүүрийг арилгах ×
            </Link>
          )}
        </div>
      </div>
      {locked ? (
        <EmptyState icon={<Target className="h-6 w-6" />} title="Энэ сэдэв түгжээтэй" description="Эхлээд суурь сэдвүүдээ эзэмшээрэй." action={<LinkButton href={`/student/learn/topic/${topic!.slug}`}>Сэдэв рүү очих</LinkButton>} />
      ) : payload.length === 0 ? (
        <EmptyState icon={<Target className="h-6 w-6" />} title="Тохирох бодлого олдсонгүй" description="Шүүлтүүрээ өөрчлөх эсвэл өөр сэдэв сонгоно уу. Шинэ бодлогууд багш нарын баталгаажуулалтын дараа нэмэгдэнэ." action={<LinkButton href="/student/learn">Сэдэв сонгох</LinkButton>} />
      ) : (
        <PracticeClient questions={payload} />
      )}
    </div>
  );
}
