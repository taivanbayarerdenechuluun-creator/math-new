import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Аудит лог" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string; action?: string }> }) {
  await requirePageRole(["ADMIN"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const where = sp.action ? { action: sp.action } : {};
  const [logs, total, actions] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50, include: { user: { select: { name: true, role: true } } } }),
    db.auditLog.count({ where }),
    db.auditLog.groupBy({ by: ["action"], _count: true }),
  ]);
  return (
    <div>
      <PageHeader title="Аудит лог" description={`Системийн чухал үйлдлүүдийн бүртгэл · ${total} бичлэг`} />
      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/admin/audit" className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${!sp.action ? "bg-fg text-bg" : "bg-surface-2 text-muted"}`}>Бүгд</Link>
        {actions.map((a) => (
          <Link key={a.action} href={`/admin/audit?action=${a.action}`} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${sp.action === a.action ? "bg-fg text-bg" : "bg-surface-2 text-muted"}`}>{a.action} {a._count}</Link>
        ))}
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-surface-2/50 text-left text-xs uppercase tracking-wide text-subtle">
              <tr><th className="px-4 py-3">Огноо</th><th className="px-4 py-3">Хэрэглэгч</th><th className="px-4 py-3">Үйлдэл</th><th className="px-4 py-3">Объект</th><th className="px-4 py-3">Дэлгэрэнгүй</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">{formatDateTime(l.createdAt)}</td>
                  <td className="px-4 py-2.5">{l.user?.name ?? "—"}</td>
                  <td className="px-4 py-2.5"><Badge tone="neutral">{l.action}</Badge></td>
                  <td className="px-4 py-2.5 font-mono text-xs">{l.entity}{l.entityId ? `:${l.entityId.slice(0, 8)}` : ""}</td>
                  <td className="max-w-xs truncate px-4 py-2.5 font-mono text-xs text-subtle">{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between border-t border-border px-4 py-3 text-sm">
          <span className="text-muted">{page}-р хуудас</span>
          <div className="flex gap-3">
            {page > 1 && <Link href={`/admin/audit?page=${page - 1}${sp.action ? `&action=${sp.action}` : ""}`} className="font-semibold text-primary">← Өмнөх</Link>}
            {page * 50 < total && <Link href={`/admin/audit?page=${page + 1}${sp.action ? `&action=${sp.action}` : ""}`} className="font-semibold text-primary">Дараах →</Link>}
          </div>
        </div>
      </Card>
    </div>
  );
}
