import Link from "next/link";
import { BookOpen, CheckCircle2, Info, Lock, Sigma } from "lucide-react";
import { requirePageRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { unlockedTopicIds } from "@/features/progress/server";
import { Alert, Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { DOMAIN_LABELS, GRADES, type Domain } from "@/lib/constants";
import { cn, pct } from "@/lib/utils";

export const metadata = { title: "Суралцах" };

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const user = await requirePageRole(["STUDENT"]);
  const sp = await searchParams;
  const grade = Number(sp.grade) || user.grade || 9;

  const units = await db.curriculumUnit.findMany({
    where: { gradeId: grade },
    orderBy: { order: "asc" },
    include: {
      topics: {
        orderBy: { order: "asc" },
        include: {
          lessons: { where: { isPublished: true }, select: { id: true } },
          formulas: { select: { id: true } },
          _count: { select: { questions: { where: { status: "PUBLISHED" } } } },
        },
      },
    },
  });
  const allTopicIds = units.flatMap((u) => u.topics.map((t) => t.id));
  const [unlocked, done] = await Promise.all([
    unlockedTopicIds(user.id, allTopicIds),
    db.learningProgress.findMany({ where: { userId: user.id }, select: { lessonId: true } }).then((r) => new Set(r.map((x) => x.lessonId))),
  ]);
  const anyUnofficial = units.some((u) => !u.isOfficial);

  return (
    <div>
      <PageHeader title="Суралцах" description="Сэдвээ сонгоод онол, томьёо, жишээгээ үзэж, дасгал ажиллаарай." eyebrow="Хөтөлбөр" />

      <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Анги сонгох">
        {GRADES.map((g) => (
          <Link
            key={g}
            href={`/student/learn?grade=${g}`}
            role="tab"
            aria-selected={g === grade}
            className={cn(
              "flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-4 text-sm font-semibold transition-colors",
              g === grade ? "border-primary bg-primary text-white" : "border-border bg-surface text-muted hover:text-fg",
            )}
          >
            {g}-р анги
            {g === user.grade && g !== grade && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
          </Link>
        ))}
      </div>

      {anyUnofficial && (
        <Alert tone="info" icon={<Info className="h-4 w-4 text-info" />} className="mb-6" title="Хөтөлбөрийн мэдээлэл">
          Энэ ангийн бүтэц нь IQ MATH-ийн багийн бэлтгэсэн ноорог бөгөөд албан ёсны цөм хөтөлбөртэй бүрэн тулгагдаж баталгаажаагүй байна.
        </Alert>
      )}

      {units.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-6 w-6" />} title="Энэ ангийн хөтөлбөр хараахан нэмэгдээгүй" description="Багш нар контент нэмсний дараа энд харагдана." />
      ) : (
        <div className="space-y-8">
          {units.map((u) => (
            <section key={u.id}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-semibold">{u.title}</h2>
                <Badge tone="neutral">{DOMAIN_LABELS[u.domain as Domain] ?? u.domain}</Badge>
                {u.isOfficial ? <Badge tone="success">Албан ёсны хөтөлбөр</Badge> : u.isEnrichment ? <Badge tone="accent">Нэмэлт агуулга</Badge> : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {u.topics.map((t) => {
                  const total = t.lessons.length;
                  const completed = t.lessons.filter((l) => done.has(l.id)).length;
                  const locked = !unlocked.has(t.id);
                  const progress = pct(completed, total);
                  return (
                    <Link key={t.id} href={`/student/learn/topic/${t.slug}`} className="group">
                      <Card className={cn("h-full p-4 transition-all group-hover:-translate-y-0.5 group-hover:shadow-card", locked && "opacity-80")}>
                        <div className="flex items-start justify-between gap-3">
                          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", locked ? "bg-surface-2 text-subtle" : progress === 100 ? "bg-success-soft text-success" : "bg-primary-soft text-primary")}>
                            {locked ? <Lock className="h-5 w-5" /> : progress === 100 ? <CheckCircle2 className="h-5 w-5" /> : <Sigma className="h-5 w-5" />}
                          </div>
                          {locked && <Badge tone="neutral">Түгжээтэй</Badge>}
                        </div>
                        <h3 className="mt-3 font-semibold leading-snug">{t.title}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{t.description}</p>
                        <div className="mt-4 flex items-center gap-3 text-xs text-subtle">
                          <span>{total} хичээл</span>
                          <span>·</span>
                          <span>{t.formulas.length} томьёо</span>
                          <span>·</span>
                          <span>{t._count.questions} дасгал</span>
                        </div>
                        {total > 0 && (
                          <div className="mt-3 h-1.5 rounded-full bg-surface-3">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                          </div>
                        )}
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
