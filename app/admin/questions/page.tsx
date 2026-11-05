import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ChevronLeft, ChevronRight, FileStack, Plus, Search } from "lucide-react";
import { requirePageRole, STAFF } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, DIFFICULTY_TONE, EmptyState, Input, LinkButton, PageHeader, STATUS_TONE, Select } from "@/components/ui/primitives";
import { MathText } from "@/components/mathematics/math-text";
import { DIFFICULTY_LABELS, GRADES, QUESTION_STATUSES, QUESTION_STATUS_LABELS, QUESTION_TYPES, QUESTION_TYPE_LABELS, type QuestionStatus, type QuestionType } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Бодлогын сан" };
const PAGE = 25;

type SP = { q?: string; grade?: string; topic?: string; difficulty?: string; type?: string; status?: string; source?: string; author?: string; sort?: string; page?: string };

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePageRole(STAFF);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.QuestionWhereInput = {
    ...(sp.grade ? { gradeId: Number(sp.grade) } : {}),
    ...(sp.topic ? { topicId: sp.topic } : {}),
    ...(sp.difficulty ? { difficulty: Number(sp.difficulty) } : {}),
    ...(sp.type ? { type: sp.type } : {}),
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.source ? { sourceId: sp.source } : {}),
    ...(sp.author ? { authorId: sp.author } : {}),
    ...(sp.q ? { OR: [{ text: { contains: sp.q } }, { code: { contains: sp.q.toUpperCase() } }, { tags: { contains: sp.q } }, { title: { contains: sp.q } }] } : {}),
  };
  const orderBy: Prisma.QuestionOrderByWithRelationInput =
    sp.sort === "oldest" ? { createdAt: "asc" } : sp.sort === "usage" ? { timesAnswered: "desc" } : sp.sort === "difficulty" ? { difficulty: "desc" } : { createdAt: "desc" };

  const [items, total, topics, sources, authors, statusCounts] = await Promise.all([
    db.question.findMany({ where, orderBy, skip: (page - 1) * PAGE, take: PAGE, include: { topic: { select: { title: true } }, author: { select: { name: true } }, source: { select: { name: true } } } }),
    db.question.count({ where }),
    db.topic.findMany({ where: sp.grade ? { unit: { gradeId: Number(sp.grade) } } : undefined, select: { id: true, title: true, unit: { select: { gradeId: true } } }, orderBy: [{ unit: { gradeId: "asc" } }, { order: "asc" }] }),
    db.questionSource.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({ where: { role: { in: ["TEACHER", "ADMIN"] } }, select: { id: true, name: true } }),
    db.question.groupBy({ by: ["status"], _count: true }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    Object.entries({ ...sp, ...patch }).forEach(([k, v]) => v && p.set(k, String(v)));
    return `/admin/questions?${p.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Бодлогын сан"
        description={`Нийт ${total} бодлого олдлоо`}
        actions={
          <>
            <LinkButton href="/admin/import" variant="outline">Импорт</LinkButton>
            <LinkButton href="/admin/questions/new">
              <Plus className="h-4 w-4" /> Шинэ бодлого
            </LinkButton>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={link({ status: undefined, page: undefined })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${!sp.status ? "bg-fg text-bg" : "bg-surface-2 text-muted"}`}>
          Бүгд
        </Link>
        {QUESTION_STATUSES.map((s) => {
          const c = statusCounts.find((x) => x.status === s)?._count ?? 0;
          return (
            <Link key={s} href={link({ status: s, page: undefined })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${sp.status === s ? "bg-fg text-bg" : "bg-surface-2 text-muted hover:text-fg"}`}>
              {QUESTION_STATUS_LABELS[s]} <span className="opacity-60">{c}</span>
            </Link>
          );
        })}
      </div>

      <Card className="mb-4 p-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8" action="/admin/questions">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <Input name="q" defaultValue={sp.q} placeholder="Код, текст, шошго…" className="pl-9" aria-label="Хайх" />
          </div>
          <Select name="grade" defaultValue={sp.grade ?? ""} aria-label="Анги">
            <option value="">Бүх анги</option>
            {GRADES.map((g) => <option key={g} value={g}>{g}-р анги</option>)}
          </Select>
          <Select name="topic" defaultValue={sp.topic ?? ""} aria-label="Сэдэв">
            <option value="">Бүх сэдэв</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.unit.gradeId}: {t.title}</option>)}
          </Select>
          <Select name="difficulty" defaultValue={sp.difficulty ?? ""} aria-label="Хүндрэл">
            <option value="">Бүх түвшин</option>
            {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>)}
          </Select>
          <Select name="type" defaultValue={sp.type ?? ""} aria-label="Төрөл">
            <option value="">Бүх төрөл</option>
            {QUESTION_TYPES.map((t) => <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>)}
          </Select>
          <Select name="source" defaultValue={sp.source ?? ""} aria-label="Эх сурвалж">
            <option value="">Бүх эх сурвалж</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select name="author" defaultValue={sp.author ?? ""} aria-label="Зохиогч">
            <option value="">Бүх зохиогч</option>
            {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Select name="sort" defaultValue={sp.sort ?? ""} aria-label="Эрэмбэ">
            <option value="">Шинэ нь эхэндээ</option>
            <option value="oldest">Хуучин нь эхэндээ</option>
            <option value="usage">Их ашиглагдсан</option>
            <option value="difficulty">Хүндээс хялбар</option>
          </Select>
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1 xl:col-span-2">
            <button className="h-10 flex-1 rounded-xl bg-primary px-4 text-sm font-semibold text-white">Шүүх</button>
            <Link href="/admin/questions" className="grid h-10 place-items-center rounded-xl border border-border px-4 text-sm font-semibold text-muted">Цэвэрлэх</Link>
          </div>
        </form>
      </Card>

      {items.length === 0 ? (
        <EmptyState icon={<FileStack className="h-6 w-6" />} title="Бодлого олдсонгүй" description="Шүүлтүүрээ өөрчлөх эсвэл шинэ бодлого нэмнэ үү." action={<LinkButton href="/admin/questions/new">Шинэ бодлого</LinkButton>} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="border-b border-border bg-surface-2/50 text-left text-xs font-semibold uppercase tracking-wide text-subtle">
                <tr>
                  <th className="px-4 py-3">Код</th>
                  <th className="px-4 py-3">Бодлого</th>
                  <th className="px-4 py-3">Анги / сэдэв</th>
                  <th className="px-4 py-3">Төрөл</th>
                  <th className="px-4 py-3">Хүндрэл</th>
                  <th className="px-4 py-3">Төлөв</th>
                  <th className="px-4 py-3">Ашиглалт</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((q) => (
                  <tr key={q.id} className="hover:bg-surface-2/40">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link href={`/admin/questions/${q.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                        {q.code}
                      </Link>
                      <p className="text-[11px] text-subtle">{formatDate(q.createdAt)}</p>
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <Link href={`/admin/questions/${q.id}`} className="line-clamp-2 hover:text-primary">
                        <MathText text={q.title ? `**${q.title}** — ${q.text}` : q.text} inline />
                      </Link>
                      <p className="mt-0.5 text-[11px] text-subtle">{q.author?.name ?? "—"}{q.source ? ` · ${q.source.name}` : ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{q.gradeId}-р</p>
                      <p className="text-xs text-muted">{q.topic?.title ?? "—"}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{QUESTION_TYPE_LABELS[q.type as QuestionType]}</td>
                    <td className="px-4 py-3"><Badge tone={DIFFICULTY_TONE[q.difficulty]}>{DIFFICULTY_LABELS[q.difficulty]}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[q.status]}>{QUESTION_STATUS_LABELS[q.status as QuestionStatus]}</Badge></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                      {q.timesAnswered ? `${q.timesAnswered} · ${Math.round((q.timesCorrect / q.timesAnswered) * 100)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <span className="text-muted">{page}/{pages} хуудас</span>
            <div className="flex gap-2">
              {page > 1 && <Link href={link({ page: String(page - 1) })} className="grid h-8 w-8 place-items-center rounded-lg border border-border" aria-label="Өмнөх"><ChevronLeft className="h-4 w-4" /></Link>}
              {page < pages && <Link href={link({ page: String(page + 1) })} className="grid h-8 w-8 place-items-center rounded-lg border border-border" aria-label="Дараах"><ChevronRight className="h-4 w-4" /></Link>}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
