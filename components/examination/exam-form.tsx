"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Save, Search, Shuffle, Trash2, Wand2 } from "lucide-react";
import { Alert, Badge, Button, Card, CardBody, CardHeader, DIFFICULTY_TONE, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { ConfirmButton } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { MathText } from "@/components/mathematics/math-text";
import { api } from "@/lib/client";
import { DIFFICULTY_LABELS, GRADES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface PQ { id: string; code: string; text: string; type: string; difficulty: number; gradeId: number; topicId: string | null; topic: string | null }
export interface ExamDraft {
  title: string;
  description: string;
  gradeId: number;
  durationMinutes: number;
  passingScore: number;
  randomize: boolean;
  showSolutions: boolean;
  isPublished: boolean;
  availableFrom: string;
  availableTo: string;
  questions: { questionId: string; points: number }[];
}

export function ExamForm({ initial, examId, pool, hasAttempts }: { initial: ExamDraft; examId?: string; pool: PQ[]; hasAttempts?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [d, setD] = React.useState(initial);
  const [search, setSearch] = React.useState("");
  const [topicFilter, setTopicFilter] = React.useState("");
  const [diffFilter, setDiffFilter] = React.useState(0);
  const [auto, setAuto] = React.useState({ easy: 3, medium: 3, hard: 2 });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const byId = new Map(pool.map((q) => [q.id, q]));
  const gradePool = pool.filter((q) => q.gradeId === d.gradeId);
  const topics = [...new Map(gradePool.filter((q) => q.topicId).map((q) => [q.topicId!, q.topic!])).entries()];
  const selectedIds = new Set(d.questions.map((q) => q.questionId));
  const available = gradePool.filter(
    (q) =>
      !selectedIds.has(q.id) &&
      (!topicFilter || q.topicId === topicFilter) &&
      (!diffFilter || q.difficulty === diffFilter) &&
      (!search || q.text.toLowerCase().includes(search.toLowerCase()) || q.code.includes(search.toUpperCase())),
  );
  const totalPoints = d.questions.reduce((s, q) => s + q.points, 0);
  const dist = { easy: 0, medium: 0, hard: 0 };
  d.questions.forEach((q) => {
    const diff = byId.get(q.questionId)?.difficulty ?? 2;
    if (diff <= 2) dist.easy++;
    else if (diff === 3) dist.medium++;
    else dist.hard++;
  });

  const add = (id: string) => setD({ ...d, questions: [...d.questions, { questionId: id, points: 1 }] });
  const move = (i: number, dir: -1 | 1) => {
    const qs = [...d.questions];
    const j = i + dir;
    if (j < 0 || j >= qs.length) return;
    [qs[i], qs[j]] = [qs[j], qs[i]];
    setD({ ...d, questions: qs });
  };

  const autoPick = () => {
    const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);
    const pickFrom = (pred: (q: PQ) => boolean, n: number) => shuffle(gradePool.filter((q) => pred(q) && (!topicFilter || q.topicId === topicFilter))).slice(0, n);
    const chosen = [...pickFrom((q) => q.difficulty <= 2, auto.easy), ...pickFrom((q) => q.difficulty === 3, auto.medium), ...pickFrom((q) => q.difficulty >= 4, auto.hard)];
    const want = auto.easy + auto.medium + auto.hard;
    if (chosen.length < want) toast({ tone: "warning", title: `Хангалттай бодлого алга: ${chosen.length}/${want} сонгогдлоо. Түвшин бүрт хүрэлцэхгүй хэсгийг гараар нэмнэ үү.` });
    setD({ ...d, questions: chosen.map((q) => ({ questionId: q.id, points: q.difficulty >= 4 ? 2 : 1 })) });
  };

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      // datetime-local нь цагийн бүсгүй тул хөтчийн цагийн бүсээр ISO болгож илгээнэ
      const iso = (s: string) => (s ? new Date(s).toISOString() : null);
      const body = { ...d, availableFrom: iso(d.availableFrom), availableTo: iso(d.availableTo) };
      if (examId) await api(`/api/admin/exams/${examId}`, { method: "PUT", json: body });
      else {
        const r = await api<{ id: string }>("/api/admin/exams", { method: "POST", json: body });
        router.push(`/admin/exams/${r.id}`);
      }
      toast({ tone: "success", title: "Шалгалт хадгалагдлаа" });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && <Alert tone="danger">{error}</Alert>}
      {hasAttempts && <Alert tone="info">Энэ шалгалтыг сурагчид өгсөн тул асуултын бүрэлдэхүүнийг өөрчлөх боломжгүй. Нэр, хугацаа, нийтлэх төлөв зэргийг өөрчилж болно.</Alert>}
      <Card>
        <CardHeader title="Тохиргоо" />
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Шалгалтын нэр" className="sm:col-span-2 lg:col-span-4">
            <Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
          </Field>
          <Field label="Тайлбар" className="sm:col-span-2 lg:col-span-4">
            <Textarea value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} rows={2} />
          </Field>
          <Field label="Анги">
            <Select value={d.gradeId} disabled={hasAttempts} onChange={(e) => setD({ ...d, gradeId: Number(e.target.value), questions: [] })}>
              {GRADES.map((g) => <option key={g} value={g}>{g}-р анги</option>)}
            </Select>
          </Field>
          <Field label="Хугацаа (минут)">
            <Input type="number" min={1} value={d.durationMinutes} onChange={(e) => setD({ ...d, durationMinutes: Number(e.target.value) })} />
          </Field>
          <Field label="Тэнцэх оноо (%)">
            <Input type="number" min={0} max={100} value={d.passingScore} onChange={(e) => setD({ ...d, passingScore: Number(e.target.value) })} />
          </Field>
          <Field label="Нийт оноо">
            <Input value={totalPoints} disabled />
          </Field>
          <Field label="Эхлэх хугацаа (заавал биш)">
            <Input type="datetime-local" value={d.availableFrom} onChange={(e) => setD({ ...d, availableFrom: e.target.value })} />
          </Field>
          <Field label="Дуусах хугацаа (заавал биш)">
            <Input type="datetime-local" value={d.availableTo} onChange={(e) => setD({ ...d, availableTo: e.target.value })} />
          </Field>
          <div className="flex flex-col justify-end gap-2 text-sm sm:col-span-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={d.randomize} onChange={(e) => setD({ ...d, randomize: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" /> Асуултын дарааллыг санамсаргүй болгох</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={d.showSolutions} onChange={(e) => setD({ ...d, showSolutions: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" /> Дуусгасны дараа бодолт харуулах</label>
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={d.isPublished} onChange={(e) => setD({ ...d, isPublished: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" /> Сурагчдад нийтлэх</label>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title={`Сонгосон асуултууд (${d.questions.length})`}
            description={`Хялбар ${dist.easy} · Дунд ${dist.medium} · Хүнд ${dist.hard}`}
            action={d.questions.length > 0 && !hasAttempts ? <Button size="sm" variant="ghost" onClick={() => setD({ ...d, questions: [] })}>Цэвэрлэх</Button> : undefined}
          />
          <CardBody className="space-y-2">
            {d.questions.length === 0 && <p className="text-sm text-muted">Баруун талаас асуулт нэмэх эсвэл автоматаар сонгоно уу.</p>}
            {d.questions.map((sq, i) => {
              const q = byId.get(sq.questionId);
              return (
                <div key={sq.questionId} className="flex items-start gap-2 rounded-xl border border-border p-2.5">
                  <span className="mt-1 w-6 text-center text-sm font-bold text-subtle">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap gap-1.5">
                      <span className="font-mono text-[11px] text-primary">{q?.code}</span>
                      {q && <Badge tone={DIFFICULTY_TONE[q.difficulty]}>{DIFFICULTY_LABELS[q.difficulty]}</Badge>}
                    </div>
                    <div className="line-clamp-2 text-sm"><MathText text={q?.text ?? "(нийтлэлээс буцаагдсан бодлого)"} inline /></div>
                  </div>
                  <Input type="number" min={1} max={100} value={sq.points} disabled={hasAttempts} onChange={(e) => setD({ ...d, questions: d.questions.map((x, j) => (j === i ? { ...x, points: Number(e.target.value) || 1 } : x)) })} className="h-8 w-16 text-center" aria-label="Оноо" />
                  {!hasAttempts && (
                    <div className="flex flex-col">
                      <button onClick={() => move(i, -1)} className="p-0.5 text-subtle hover:text-fg" aria-label="Дээш"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button onClick={() => move(i, 1)} className="p-0.5 text-subtle hover:text-fg" aria-label="Доош"><ArrowDown className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                  {!hasAttempts && <button onClick={() => setD({ ...d, questions: d.questions.filter((_, j) => j !== i) })} className="p-1.5 text-subtle hover:text-danger" aria-label="Хасах"><Trash2 className="h-4 w-4" /></button>}
                </div>
              );
            })}
          </CardBody>
        </Card>

        {!hasAttempts && (
          <Card>
            <CardHeader title="Бодлогын сан" description={`Зөвхөн нийтлэгдсэн (баталгаажсан) ${gradePool.length} бодлого`} />
            <CardBody className="space-y-3">
              <div className="rounded-xl bg-surface-2/50 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Wand2 className="h-4 w-4 text-primary" /> Хүндрэлийн хуваарилалтаар автоматаар сонгох</p>
                <div className="flex flex-wrap items-end gap-2">
                  {(["easy", "medium", "hard"] as const).map((k) => (
                    <label key={k} className="text-xs text-muted">
                      {k === "easy" ? "Хялбар (1–2)" : k === "medium" ? "Дунд (3)" : "Хүнд (4–5)"}
                      <Input type="number" min={0} max={50} value={auto[k]} onChange={(e) => setAuto({ ...auto, [k]: Number(e.target.value) })} className="mt-1 h-8 w-20" />
                    </label>
                  ))}
                  <Button size="sm" variant="outline" onClick={autoPick}><Shuffle className="h-4 w-4" /> Сонгох</Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="relative sm:col-span-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Хайх…" className="pl-9" />
                </div>
                <Select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className="sm:col-span-2">
                  <option value="">Бүх сэдэв</option>
                  {topics.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
                </Select>
                <Select value={diffFilter} onChange={(e) => setDiffFilter(Number(e.target.value))}>
                  <option value={0}>Бүх түвшин</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{DIFFICULTY_LABELS[n]}</option>)}
                </Select>
              </div>
              <div className="max-h-[480px] space-y-1.5 overflow-y-auto">
                {available.length === 0 && <p className="py-6 text-center text-sm text-muted">Тохирох бодлого алга.</p>}
                {available.map((q) => (
                  <button key={q.id} onClick={() => add(q.id)} className={cn("flex w-full items-start gap-2 rounded-xl border border-border p-2.5 text-left hover:border-primary/40 hover:bg-primary-soft/30")}>
                    <Plus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap gap-1.5">
                        <span className="font-mono text-[11px] text-primary">{q.code}</span>
                        <Badge tone={DIFFICULTY_TONE[q.difficulty]}>{DIFFICULTY_LABELS[q.difficulty]}</Badge>
                        {q.topic && <span className="text-[11px] text-subtle">{q.topic}</span>}
                      </div>
                      <div className="line-clamp-2 text-sm"><MathText text={q.text} inline /></div>
                    </div>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      <div className="sticky bottom-20 z-10 flex justify-end gap-2 rounded-2xl border border-border bg-surface/95 p-3 shadow-float backdrop-blur lg:bottom-4">
        {examId && !hasAttempts && (
          <ConfirmButton
            className="mr-auto"
            title="Шалгалтыг устгах уу?"
            confirmLabel="Устгах"
            onConfirm={async () => {
              try {
                await api(`/api/admin/exams/${examId}`, { method: "DELETE" });
                router.replace("/admin/exams");
                router.refresh();
              } catch (e) {
                toast({ tone: "error", title: (e as Error).message });
              }
            }}
          >
            <Button variant="ghost" className="text-danger"><Trash2 className="h-4 w-4" /> Устгах</Button>
          </ConfirmButton>
        )}
        <Button onClick={save} loading={saving}><Save className="h-4 w-4" /> Хадгалах</Button>
      </div>
    </div>
  );
}
