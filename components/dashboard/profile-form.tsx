"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Save, Trash2 } from "lucide-react";
import { Alert, Avatar, Button, Card, CardBody, CardHeader, Field, Input, Select } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";
import { EXPLAIN_MODE_LABELS, GRADES, type ExplainMode } from "@/lib/constants";
import { cn } from "@/lib/utils";

const COLORS = ["violet", "indigo", "cyan", "emerald", "amber", "rose"];

export function ProfileForm({
  user,
}: {
  user: { name: string; email: string; role: string; grade: number | null; dailyGoal: number; explainMode: string; avatarColor: string; showOnLeaderboard: boolean };
}) {
  const router = useRouter();
  const toast = useToast();
  const isStudent = user.role === "STUDENT";
  const [form, setForm] = React.useState({
    name: user.name,
    grade: user.grade ?? 9,
    dailyGoal: user.dailyGoal,
    explainMode: user.explainMode as ExplainMode,
    avatarColor: user.avatarColor,
    showOnLeaderboard: user.showOnLeaderboard,
  });
  const [pw, setPw] = React.useState({ currentPassword: "", newPassword: "" });
  const [saving, setSaving] = React.useState(false);
  const [pwSaving, setPwSaving] = React.useState(false);
  const [del, setDel] = React.useState(false);
  const [delPw, setDelPw] = React.useState("");
  const [delErr, setDelErr] = React.useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    try {
      await api("/api/profile", { method: "PATCH", json: isStudent ? form : { name: form.name, avatarColor: form.avatarColor } });
      toast({ tone: "success", title: "Хадгаллаа" });
      router.refresh();
    } catch (e) {
      toast({ tone: "error", title: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader title="Хувийн мэдээлэл" />
        <CardBody className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar name={form.name} color={form.avatarColor} size={60} />
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, avatarColor: c })} className={cn("rounded-full p-0.5", form.avatarColor === c && "ring-2 ring-primary")} aria-label={c} aria-pressed={form.avatarColor === c}>
                  <Avatar name=" " color={c} size={24} />
                </button>
              ))}
            </div>
          </div>
          <Field label="Нэр" htmlFor="pname">
            <Input id="pname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Имэйл">
            <Input value={user.email} disabled />
          </Field>
          {isStudent && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Анги">
                  <Select value={form.grade} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })}>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}-р анги
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Өдрийн зорилго (бодлого)">
                  <Input type="number" min={1} max={50} value={form.dailyGoal} onChange={(e) => setForm({ ...form, dailyGoal: Number(e.target.value) })} />
                </Field>
              </div>
              <Field label="AI тайлбарын түвшин">
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(EXPLAIN_MODE_LABELS) as ExplainMode[]).map((m) => (
                    <button key={m} onClick={() => setForm({ ...form, explainMode: m })} className={cn("h-10 rounded-xl border text-sm font-semibold", form.explainMode === m ? "border-primary bg-primary-soft text-primary" : "border-border text-muted")} aria-pressed={form.explainMode === m}>
                      {EXPLAIN_MODE_LABELS[m]}
                    </button>
                  ))}
                </div>
              </Field>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
                <span>
                  <span className="block text-sm font-semibold">Тэргүүлэгчдийн жагсаалтад харагдах</span>
                  <span className="text-xs text-muted">Зөвхөн нэр, XP харагдана</span>
                </span>
                <input type="checkbox" checked={form.showOnLeaderboard} onChange={(e) => setForm({ ...form, showOnLeaderboard: e.target.checked })} className="h-5 w-5 accent-[var(--primary)]" />
              </label>
            </>
          )}
          <div className="flex justify-end">
            <Button onClick={save} loading={saving}>
              <Save className="h-4 w-4" /> Хадгалах
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Нууц үг солих" icon={<KeyRound className="h-4 w-4" />} />
          <CardBody className="space-y-3">
            <Field label="Одоогийн нууц үг">
              <Input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            </Field>
            <Field label="Шинэ нууц үг" hint="8+ тэмдэгт, үсэг ба тоо">
              <Input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            </Field>
            <Button
              variant="outline"
              className="w-full"
              loading={pwSaving}
              disabled={!pw.currentPassword || !pw.newPassword}
              onClick={async () => {
                setPwSaving(true);
                try {
                  await api("/api/profile", { method: "PATCH", json: pw });
                  setPw({ currentPassword: "", newPassword: "" });
                  toast({ tone: "success", title: "Нууц үг солигдлоо" });
                } catch (e) {
                  toast({ tone: "error", title: (e as Error).message });
                } finally {
                  setPwSaving(false);
                }
              }}
            >
              Нууц үг солих
            </Button>
          </CardBody>
        </Card>
        {isStudent && (
          <Card>
            <CardHeader title="Бүртгэл устгах" description="Таны бүх өгөгдөл (ахиц, түүх, зураг) бүрмөсөн устна." />
            <CardBody>
              <Button variant="outline" className="w-full text-danger" onClick={() => setDel(true)}>
                <Trash2 className="h-4 w-4" /> Бүртгэлээ устгах
              </Button>
            </CardBody>
          </Card>
        )}
      </div>

      <Modal
        open={del}
        onClose={() => setDel(false)}
        title="Бүртгэлээ устгах уу?"
        description="Энэ үйлдлийг буцаах боломжгүй."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDel(false)}>
              Болих
            </Button>
            <Button
              variant="danger"
              disabled={!delPw}
              onClick={async () => {
                try {
                  await api("/api/profile", { method: "DELETE", json: { password: delPw } });
                  router.replace("/");
                  router.refresh();
                } catch (e) {
                  setDelErr((e as Error).message);
                }
              }}
            >
              Бүрмөсөн устгах
            </Button>
          </>
        }
      >
        {delErr && <Alert tone="danger" className="mb-3">{delErr}</Alert>}
        <Field label="Баталгаажуулахын тулд нууц үгээ оруулна уу">
          <Input type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}
