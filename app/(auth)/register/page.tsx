"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui/primitives";
import { api } from "@/lib/client";
import { GRADES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = React.useState({ name: "", email: "", password: "", grade: 9 });
  const [agree, setAgree] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) return setError("Үйлчилгээний нөхцөл ба нууцлалын бодлогыг зөвшөөрнө үү.");
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ redirect: string }>("/api/auth/register", { method: "POST", json: form });
      router.replace(res.redirect);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Бүртгэл үүсгэх</h1>
      <p className="mt-1.5 text-sm text-muted">Хэдхэн секундэд бүртгүүлээд суралцаж эхлээрэй.</p>
      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Нэр" htmlFor="name" hint="Бусад хэрэглэгчдэд харагдах нэр (хоч байж болно)">
          <Input id="name" autoComplete="nickname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="Имэйл" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </Field>
        <Field label="Нууц үг" htmlFor="password" hint="Хамгийн багадаа 8 тэмдэгт, үсэг ба тоо агуулсан">
          <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </Field>
        <Field label="Анги">
          <div className="grid grid-cols-7 gap-1.5">
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setForm({ ...form, grade: g })}
                className={cn(
                  "h-10 rounded-xl border text-sm font-semibold transition-colors",
                  form.grade === g ? "border-primary bg-primary text-white" : "border-border bg-surface text-muted hover:border-border-strong",
                )}
                aria-pressed={form.grade === g}
              >
                {g}
              </button>
            ))}
          </div>
        </Field>
        <label className="flex items-start gap-2.5 text-sm text-muted">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
          <span>
            Үйлчилгээний нөхцөл, нууцлалын бодлогыг зөвшөөрч байна. 16-аас доош настай бол эцэг эх/асран хамгаалагчийнхаа зөвшөөрлөөр бүртгүүлнэ.
          </span>
        </label>
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          <UserPlus className="h-4 w-4" /> Бүртгүүлэх
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Бүртгэлтэй юу?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Нэвтрэх
        </Link>
      </p>
    </>
  );
}
