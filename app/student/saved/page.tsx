import Link from "next/link";
import { Bookmark, History, Star } from "lucide-react";
import { requirePageRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui/primitives";
import { VerificationBadge } from "@/components/mathematics/solution-view";
import { MathText } from "@/components/mathematics/math-text";
import { cn, formatDate } from "@/lib/utils";
import { UnsaveButton } from "./unsave-button";

export const metadata = { title: "Хадгалсан бодлого" };

const TABS = [
  { v: "favorites", label: "Дуртай бодолтууд", icon: Star },
  { v: "bank", label: "Хадгалсан дасгал", icon: Bookmark },
  { v: "history", label: "Бодогчийн түүх", icon: History },
] as const;

export default async function SavedPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requirePageRole(["STUDENT"]);
  const tab = (await searchParams).tab ?? "favorites";

  const [problems, bank] = await Promise.all([
    tab === "bank"
      ? Promise.resolve([])
      : db.solvedProblem.findMany({ where: { userId: user.id, ...(tab === "favorites" ? { isFavorite: true } : {}) }, orderBy: { createdAt: "desc" }, take: 100 }),
    tab === "bank"
      ? db.savedQuestion.findMany({ where: { userId: user.id }, include: { question: { include: { topic: true } } }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Хадгалсан бодлого" description="Дуртай бодолт, хадгалсан дасгал, бодогчийн бүх түүх." />
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1">
        {TABS.map((t) => (
          <Link key={t.v} href={`/student/saved?tab=${t.v}`} className={cn("flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold", tab === t.v ? "bg-surface text-fg shadow-soft" : "text-muted hover:text-fg")}>
            <t.icon className="h-4 w-4" /> {t.label}
          </Link>
        ))}
      </div>

      {tab === "bank" ? (
        bank.length === 0 ? (
          <EmptyState icon={<Bookmark className="h-6 w-6" />} title="Хадгалсан дасгал алга" description="Дасгал ажиллахдаа хавчуурга дүрсийг дарж хадгална." action={<LinkButton href="/student/practice">Дасгал ажиллах</LinkButton>} />
        ) : (
          <div className="space-y-3">
            {bank.map((s) => (
              <Card key={s.id} className="flex items-start gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge tone="neutral">{s.question.gradeId}-р анги</Badge>
                    {s.question.topic && <Badge tone="primary">{s.question.topic.title}</Badge>}
                  </div>
                  <MathText text={s.question.text} />
                  {s.question.topic && (
                    <Link href={`/student/practice?topic=${s.question.topic.slug}`} className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
                      Энэ сэдвээр дасгал ажиллах →
                    </Link>
                  )}
                </div>
                <UnsaveButton questionId={s.questionId} />
              </Card>
            ))}
          </div>
        )
      ) : problems.length === 0 ? (
        <EmptyState
          icon={tab === "favorites" ? <Star className="h-6 w-6" /> : <History className="h-6 w-6" />}
          title={tab === "favorites" ? "Дуртай бодолт алга" : "Түүх хоосон байна"}
          description={tab === "favorites" ? "Бодолтын хуудсан дээрх ⭐ товчоор хадгална." : "Бодогч ашиглаж бодсон бодлогууд энд хадгалагдана."}
          action={<LinkButton href="/student/solve">Бодлого бодох</LinkButton>}
        />
      ) : (
        <div className="space-y-2">
          {problems.map((p) => (
            <Link key={p.id} href={`/student/solve/history/${p.id}`}>
              <Card className="flex items-center gap-4 p-4 transition-colors hover:border-primary/40">
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    <MathText text={p.recognizedLatex?.includes("$") || /[а-яөү]/i.test(p.recognizedLatex ?? "") ? (p.recognizedLatex ?? "") : `$${p.recognizedLatex ?? ""}$`} inline />
                  </div>
                  <p className="mt-1 text-xs text-subtle">
                    {p.topic ?? "—"} · {formatDate(p.createdAt)}
                  </p>
                </div>
                {p.isFavorite && <Star className="h-4 w-4 shrink-0 fill-warning text-warning" />}
                <VerificationBadge v={p.verification as "VERIFIED" | "MISMATCH" | "UNVERIFIED"} engine={p.engine as "SYMBOLIC" | "AI" | "AI+SYMBOLIC"} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
