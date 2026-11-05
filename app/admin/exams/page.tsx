import Link from "next/link";
import { ClipboardCheck, Plus } from "lucide-react";
import { requirePageRole, STAFF } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Шалгалтын удирдлага" };

export default async function AdminExams() {
  await requirePageRole(STAFF);
  const exams = await db.examination.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { questions: true } },
      attempts: { where: { status: { not: "IN_PROGRESS" } }, select: { percentage: true, pendingReview: true } },
      createdBy: { select: { name: true } },
    },
  });
  return (
    <div>
      <PageHeader title="Шалгалт" description="Шалгалт үүсгэх, тохируулах, үр дүн болон нээлттэй хариултыг үнэлэх." actions={<LinkButton href="/admin/exams/new"><Plus className="h-4 w-4" /> Шинэ шалгалт</LinkButton>} />
      {exams.length === 0 ? (
        <EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title="Шалгалт алга" action={<LinkButton href="/admin/exams/new">Шинэ шалгалт</LinkButton>} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border bg-surface-2/50 text-left text-xs uppercase tracking-wide text-subtle">
                <tr>
                  <th className="px-4 py-3">Шалгалт</th>
                  <th className="px-4 py-3">Анги</th>
                  <th className="px-4 py-3">Асуулт / хугацаа</th>
                  <th className="px-4 py-3">Оролцоо</th>
                  <th className="px-4 py-3">Дундаж</th>
                  <th className="px-4 py-3">Төлөв</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {exams.map((e) => {
                  const avg = e.attempts.length ? Math.round(e.attempts.reduce((s, a) => s + (a.percentage ?? 0), 0) / e.attempts.length) : null;
                  const pending = e.attempts.filter((a) => a.pendingReview).length;
                  return (
                    <tr key={e.id} className="hover:bg-surface-2/40">
                      <td className="px-4 py-3">
                        <Link href={`/admin/exams/${e.id}`} className="font-semibold hover:text-primary">{e.title}</Link>
                        <p className="text-xs text-subtle">{e.createdBy?.name ?? "—"} · {formatDate(e.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">{e.gradeId}-р</td>
                      <td className="px-4 py-3 text-muted">{e._count.questions} · {e.durationMinutes} мин</td>
                      <td className="px-4 py-3">
                        {e.attempts.length}
                        {pending > 0 && <Badge tone="warning" className="ml-2">{pending} үнэлгээ хүлээж буй</Badge>}
                      </td>
                      <td className="px-4 py-3">{avg !== null ? `${avg}%` : "—"}</td>
                      <td className="px-4 py-3">{e.isPublished ? <Badge tone="success">Нийтлэгдсэн</Badge> : <Badge tone="neutral">Ноорог</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
