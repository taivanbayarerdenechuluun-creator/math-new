"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Plus, Search, UserCog } from "lucide-react";
import { Avatar, Badge, Button, Card, Field, Input, Select } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";
import { GRADES, ROLES, ROLE_LABELS, type Role } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

interface U { id: string; name: string; email: string; role: Role; grade: number | null; isActive: boolean; createdAt: string; avatarColor: string; topicAssignments: { gradeId: number }[] }

export function UsersClient({ users, selfId, filters }: { users: U[]; selfId: string; filters: { role?: string; q?: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [create, setCreate] = React.useState(false);
  const [edit, setEdit] = React.useState<U | null>(null);
  const [form, setForm] = React.useState({ name: "", email: "", password: "", role: "TEACHER" as Role, grade: 9 });
  const [grades, setGrades] = React.useState<number[]>([]);
  const [newPw, setNewPw] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast({ tone: "success", title: msg });
      setCreate(false);
      setEdit(null);
      router.refresh();
    } catch (e) {
      toast({ tone: "error", title: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-2 p-4">
        <form className="flex flex-1 flex-wrap gap-2" action="/admin/users">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <Input name="q" defaultValue={filters.q} placeholder="Нэр, имэйл" className="pl-9" />
          </div>
          <Select name="role" defaultValue={filters.role ?? ""} className="w-40">
            <option value="">Бүх эрх</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </Select>
          <button className="h-10 rounded-xl border border-border px-4 text-sm font-semibold">Шүүх</button>
        </form>
        <Button onClick={() => { setForm({ name: "", email: "", password: "", role: "TEACHER", grade: 9 }); setCreate(true); }}><Plus className="h-4 w-4" /> Хэрэглэгч нэмэх</Button>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-surface-2/50 text-left text-xs uppercase tracking-wide text-subtle">
              <tr><th className="px-4 py-3">Хэрэглэгч</th><th className="px-4 py-3">Эрх</th><th className="px-4 py-3">Анги</th><th className="px-4 py-3">Төлөв</th><th className="px-4 py-3">Бүртгүүлсэн</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className={cn(!u.isActive && "opacity-60")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} color={u.avatarColor} size={32} />
                      <div><p className="font-semibold">{u.name}{u.id === selfId && <span className="ml-1 text-xs text-subtle">(та)</span>}</p><p className="text-xs text-muted">{u.email}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge tone={u.role === "ADMIN" ? "primary" : u.role === "TEACHER" ? "accent" : "neutral"}>{ROLE_LABELS[u.role]}</Badge></td>
                  <td className="px-4 py-3 text-muted">{u.role === "STUDENT" ? `${u.grade ?? "—"}-р` : u.role === "TEACHER" ? (u.topicAssignments.length ? u.topicAssignments.map((a) => a.gradeId).sort((a, b) => a - b).join(", ") : "Бүх анги") : "—"}</td>
                  <td className="px-4 py-3">{u.isActive ? <Badge tone="success">Идэвхтэй</Badge> : <Badge tone="danger">Хаагдсан</Badge>}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setEdit(u); setGrades(u.topicAssignments.map((a) => a.gradeId)); setNewPw(""); }}><UserCog className="h-4 w-4" /> Удирдах</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={create} onClose={() => setCreate(false)} title="Шинэ хэрэглэгч" footer={<><Button variant="ghost" onClick={() => setCreate(false)}>Болих</Button><Button loading={busy} onClick={() => run(() => api("/api/admin/users", { method: "POST", json: form }), "Хэрэглэгч үүслээ")}>Үүсгэх</Button></>}>
        <div className="space-y-3">
          <Field label="Нэр"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Имэйл"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Түр нууц үг" hint="8+ тэмдэгт, тоо агуулсан. Хэрэглэгч нэвтэрсний дараа солино."><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Эрх"><Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</Select></Field>
            {form.role === "STUDENT" && <Field label="Анги"><Select value={form.grade} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}</Select></Field>}
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.name ?? ""} description={edit?.email}>
        {edit && (
          <div className="space-y-5">
            <Field label="Эрх">
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <Button key={r} size="sm" variant={edit.role === r ? "primary" : "outline"} disabled={busy || edit.role === r || (edit.id === selfId && r !== "ADMIN")} onClick={() => run(() => api(`/api/admin/users/${edit.id}`, { method: "PATCH", json: { role: r } }), "Эрх өөрчлөгдлөө")}>{ROLE_LABELS[r]}</Button>
                ))}
              </div>
            </Field>
            {edit.role === "TEACHER" && (
              <Field label="Хариуцах ангиуд" hint="Сонгоогүй бол бүх ангийн контентыг засах эрхтэй">
                <div className="flex flex-wrap gap-1.5">
                  {GRADES.map((g) => (
                    <button key={g} onClick={() => setGrades(grades.includes(g) ? grades.filter((x) => x !== g) : [...grades, g])} className={cn("h-9 w-12 rounded-lg border text-sm font-semibold", grades.includes(g) ? "border-primary bg-primary text-white" : "border-border text-muted")} aria-pressed={grades.includes(g)}>{g}</button>
                  ))}
                  <Button size="sm" variant="outline" loading={busy} onClick={() => run(() => api(`/api/admin/users/${edit.id}`, { method: "PATCH", json: { grades } }), "Ангиуд хадгалагдлаа")}>Хадгалах</Button>
                </div>
              </Field>
            )}
            <Field label="Нууц үг шинэчлэх">
              <div className="flex gap-2">
                <Input value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Шинэ түр нууц үг" />
                <Button variant="outline" disabled={newPw.length < 8 || busy} onClick={() => run(() => api(`/api/admin/users/${edit.id}`, { method: "PATCH", json: { resetPassword: newPw } }), "Нууц үг шинэчлэгдлээ")}><KeyRound className="h-4 w-4" /></Button>
              </div>
            </Field>
            {edit.id !== selfId && (
              <Button variant={edit.isActive ? "outline" : "success"} className={cn("w-full", edit.isActive && "text-danger")} loading={busy} onClick={() => run(() => api(`/api/admin/users/${edit.id}`, { method: "PATCH", json: { isActive: !edit.isActive } }), edit.isActive ? "Бүртгэл хаагдлаа" : "Бүртгэл нээгдлээ")}>
                {edit.isActive ? "Бүртгэлийг түр хаах" : "Бүртгэлийг сэргээх"}
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
