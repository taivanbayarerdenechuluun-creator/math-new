"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui/primitives";
import { api } from "@/lib/client";

// Демо бүртгэлийн товчийг зөвхөн хөгжүүлэлтэд эсвэл NEXT_PUBLIC_DEMO_LOGINS=true үед харуулна
const SHOW_DEMO = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEMO_LOGINS === "true";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ redirect: string }>("/api/auth/login", { method: "POST", json: { email, password } });
      const next = params.get("next");
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      router.replace(safeNext && safeNext.startsWith(res.redirect) ? safeNext : res.redirect);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  const demo = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Тавтай морил</h1>
      <p className="mt-1.5 text-sm text-muted">Бүртгэлээрээ нэвтэрч суралцаж эхэлцгээе.</p>
      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        {error && <Alert tone="danger">{error}</Alert>}
        <Field label="Имэйл" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ner@example.com" required />
        </Field>
        <Field label="Нууц үг" htmlFor="password">
          <div className="relative">
            <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-subtle hover:text-fg" aria-label={show ? "Нуух" : "Харуулах"}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          <LogIn className="h-4 w-4" /> Нэвтрэх
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Бүртгэлгүй юу?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Бүртгүүлэх
        </Link>
      </p>
      {SHOW_DEMO && (
      <div className="mt-8 rounded-2xl border border-dashed border-border-strong p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Туршилтын бүртгэлүүд</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            ["Сурагч", "student@iqmath.mn", "Student123!"],
            ["Багш", "teacher@iqmath.mn", "Teacher123!"],
            ["Админ", "admin@iqmath.mn", "Admin123!"],
          ].map(([l, e, p]) => (
            <button key={e} type="button" onClick={() => demo(e, p)} className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-semibold text-muted hover:text-fg">
              {l}
            </button>
          ))}
        </div>
      </div>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense>
      <LoginForm />
    </React.Suspense>
  );
}
