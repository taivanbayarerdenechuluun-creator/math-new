"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronDown, Link2, Pencil, Plus, ShieldCheck, Sigma, Trash2, X } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { ConfirmButton, Modal } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { MathText, Tex } from "@/components/mathematics/math-text";
import { api } from "@/lib/client";
import { DOMAINS, DOMAIN_LABELS, type Domain } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Lesson { id: string; title: string; summary: string | null; content: string; examples: string; order: number; durationMin: number; isPublished: boolean; isEnrichment: boolean }
interface Formula { id: string; title: string; latex: string; description: string | null }
interface Topic {
  id: string; slug: string; title: string; description: string | null; order: number;
  lessons: Lesson[]; formulas: Formula[];
  prerequisites: { id: string; prerequisite: { id: string; title: string; unit: { gradeId: number } } }[];
  _count: { questions: number };
}
interface Unit { id: string; title: string; description: string | null; domain: string; order: number; isOfficial: boolean; isEnrichment: boolean; verificationNote: string | null; topics: Topic[] }

type ModalState =
  | { kind: "unit"; data?: Unit }
  | { kind: "topic"; unitId: string; data?: Topic }
  | { kind: "lesson"; topicId: string; data?: Lesson }
  | { kind: "formula"; topicId: string; data?: Formula }
  | { kind: "prereq"; topic: Topic }
  | null;

export function CurriculumManager({ grade, units, allTopics, isAdmin }: { grade: number; units: Unit[]; allTopics: { id: string; title: string; grade: number }[]; isAdmin: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [modal, setModal] = React.useState<ModalState>(null);
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  const [form, setForm] = React.useState<Record<string, unknown>>({});
  const [saving, setSaving] = React.useState(false);

  const openModal = (m: ModalState) => {
    setModal(m);
    if (!m) return;
    if (m.kind === "unit") setForm(m.data ? { ...m.data } : { title: "", description: "", domain: "ALGEBRA", order: units.length, isOfficial: false, isEnrichment: false, verificationNote: "" });
    if (m.kind === "topic") setForm(m.data ? { title: m.data.title, description: m.data.description ?? "", order: m.data.order } : { title: "", description: "", order: 0 });
    if (m.kind === "lesson")
      setForm(
        m.data
          ? { ...m.data, examples: JSON.parse(m.data.examples || "[]") }
          : { title: "", summary: "", content: "## Гол ойлголт\n\nАгуулгаа энд бичнэ үү. Томьёо: $a^2 + b^2 = c^2$\n", examples: [], order: 0, durationMin: 15, isPublished: true, isEnrichment: false },
      );
    if (m.kind === "formula") setForm(m.data ? { ...m.data } : { title: "", latex: "", description: "" });
    if (m.kind === "prereq") setForm({ prerequisiteId: "" });
  };

  const call = async (fn: () => Promise<unknown>, msg: string) => {
    setSaving(true);
    try {
      await fn();
      toast({ tone: "success", title: msg });
      setModal(null);
      router.refresh();
    } catch (e) {
      toast({ tone: "error", title: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    if (!modal) return;
    if (modal.kind === "unit") {
      const body = { ...form, gradeId: grade };
      return call(() => (modal.data ? api(`/api/admin/curriculum/units/${modal.data.id}`, { method: "PUT", json: body }) : api("/api/admin/curriculum/units", { method: "POST", json: body })), "Бүлэг хадгалагдлаа");
    }
    if (modal.kind === "topic") {
      const body = { ...form, unitId: modal.unitId };
      return call(() => (modal.data ? api(`/api/admin/curriculum/topics/${modal.data.id}`, { method: "PUT", json: body }) : api("/api/admin/curriculum/topics", { method: "POST", json: body })), "Сэдэв хадгалагдлаа");
    }
    if (modal.kind === "lesson") {
      const body = { ...form, topicId: modal.topicId };
      return call(() => (modal.data ? api(`/api/admin/curriculum/lessons/${modal.data.id}`, { method: "PUT", json: body }) : api("/api/admin/curriculum/lessons", { method: "POST", json: body })), "Хичээл хадгалагдлаа");
    }
    if (modal.kind === "formula") {
      const body = { ...form, topicId: modal.topicId };
      return call(() => (modal.data ? api(`/api/admin/curriculum/formulas/${modal.data.id}`, { method: "PUT", json: body }) : api("/api/admin/curriculum/formulas", { method: "POST", json: body })), "Томьёо хадгалагдлаа");
    }
    if (modal.kind === "prereq") {
      return call(() => api("/api/admin/curriculum/prerequisites", { method: "POST", json: { topicId: modal.topic.id, prerequisiteId: form.prerequisiteId } }), "Урьдчилсан нөхцөл нэмэгдлээ");
    }
  };

  const del = (entity: string, id: string) => call(() => api(`/api/admin/curriculum/${entity}/${id}`, { method: "DELETE" }), "Устгагдлаа");
  const f = (k: string) => (form[k] as string) ?? "";
  const examples = (form.examples as { problem: string; solution: string }[]) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => openModal({ kind: "unit" })}>
          <Plus className="h-4 w-4" /> Бүлэг нэмэх
        </Button>
      </div>
      {units.length === 0 && <EmptyState icon={<BookOpen className="h-6 w-6" />} title="Энэ ангид бүлэг алга" description="Эхний бүлгээ нэмнэ үү." />}

      {units.map((u) => (
        <Card key={u.id} className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface-2/40 px-5 py-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base font-semibold">{u.title}</h2>
                <Badge tone="neutral">{DOMAIN_LABELS[u.domain as Domain]}</Badge>
                {u.isOfficial ? <Badge tone="success"><ShieldCheck className="h-3 w-3" /> Албан ёсны</Badge> : <Badge tone="warning">Баталгаажаагүй</Badge>}
                {u.isEnrichment && <Badge tone="accent">Нэмэлт</Badge>}
              </div>
              {u.verificationNote && !u.isOfficial && <p className="mt-1 text-xs text-muted">{u.verificationNote}</p>}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => openModal({ kind: "topic", unitId: u.id })}><Plus className="h-4 w-4" /> Сэдэв</Button>
              <Button size="sm" variant="ghost" onClick={() => openModal({ kind: "unit", data: u })} aria-label="Засах"><Pencil className="h-4 w-4" /></Button>
              <ConfirmButton title="Бүлгийг устгах уу?" description="Доторх бүх сэдэв, хичээл устна." confirmLabel="Устгах" onConfirm={() => del("units", u.id)}>
                <Button size="sm" variant="ghost" className="text-danger" aria-label="Устгах"><Trash2 className="h-4 w-4" /></Button>
              </ConfirmButton>
            </div>
          </div>
          <div className="divide-y divide-border">
            {u.topics.length === 0 && <p className="px-5 py-4 text-sm text-muted">Сэдэв алга.</p>}
            {u.topics.map((t) => (
              <div key={t.id}>
                <button onClick={() => setOpen({ ...open, [t.id]: !open[t.id] })} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface-2/40" aria-expanded={Boolean(open[t.id])}>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-subtle transition-transform", open[t.id] && "rotate-180")} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-xs text-muted">
                      {t.lessons.length} хичээл · {t.formulas.length} томьёо · {t._count.questions} бодлого{t.prerequisites.length ? ` · ${t.prerequisites.length} урьдчилсан нөхцөл` : ""}
                    </p>
                  </div>
                  <span className="hidden font-mono text-[11px] text-subtle sm:block">{t.slug}</span>
                </button>
                {open[t.id] && (
                  <div className="space-y-4 bg-surface-2/20 px-5 pb-5 pt-1 sm:pl-12">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openModal({ kind: "topic", unitId: u.id, data: t })}><Pencil className="h-3.5 w-3.5" /> Сэдэв засах</Button>
                      <ConfirmButton title="Сэдвийг устгах уу?" confirmLabel="Устгах" onConfirm={() => del("topics", t.id)}>
                        <Button size="sm" variant="ghost" className="text-danger"><Trash2 className="h-3.5 w-3.5" /> Устгах</Button>
                      </ConfirmButton>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Хичээлүүд</p>
                        <Button size="sm" variant="ghost" onClick={() => openModal({ kind: "lesson", topicId: t.id })}><Plus className="h-3.5 w-3.5" /> Хичээл</Button>
                      </div>
                      {t.lessons.length === 0 ? <p className="text-sm text-muted">Хичээл алга.</p> : (
                        <ul className="space-y-1.5">
                          {t.lessons.map((l) => (
                            <li key={l.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                              <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                              <span className="min-w-0 flex-1 truncate text-sm font-medium">{l.title}</span>
                              {!l.isPublished && <Badge tone="neutral">Нуусан</Badge>}
                              {l.isEnrichment && <Badge tone="accent">Нэмэлт</Badge>}
                              <button onClick={() => openModal({ kind: "lesson", topicId: t.id, data: l })} className="rounded p-1 text-subtle hover:text-fg" aria-label="Засах"><Pencil className="h-3.5 w-3.5" /></button>
                              <ConfirmButton title="Хичээлийг устгах уу?" confirmLabel="Устгах" onConfirm={() => del("lessons", l.id)}>
                                <button className="rounded p-1 text-subtle hover:text-danger" aria-label="Устгах"><Trash2 className="h-3.5 w-3.5" /></button>
                              </ConfirmButton>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Томьёо</p>
                        <Button size="sm" variant="ghost" onClick={() => openModal({ kind: "formula", topicId: t.id })}><Plus className="h-3.5 w-3.5" /> Томьёо</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {t.formulas.map((fm) => (
                          <span key={fm.id} className="group flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5">
                            <Sigma className="h-3.5 w-3.5 text-subtle" />
                            <span className="text-xs text-muted">{fm.title}:</span>
                            <Tex tex={fm.latex} />
                            <button onClick={() => openModal({ kind: "formula", topicId: t.id, data: fm })} className="text-subtle hover:text-fg" aria-label="Засах"><Pencil className="h-3 w-3" /></button>
                            <button onClick={() => del("formulas", fm.id)} className="text-subtle hover:text-danger" aria-label="Устгах"><X className="h-3 w-3" /></button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Урьдчилсан нөхцөл (эзэмшсний дараа нээгдэнэ)</p>
                        <Button size="sm" variant="ghost" onClick={() => openModal({ kind: "prereq", topic: t })}><Link2 className="h-3.5 w-3.5" /> Нэмэх</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {t.prerequisites.length === 0 && <p className="text-sm text-muted">Байхгүй — шууд нээлттэй.</p>}
                        {t.prerequisites.map((p) => (
                          <span key={p.id} className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-sm">
                            {p.prerequisite.title} <span className="text-xs text-subtle">({p.prerequisite.unit.gradeId}-р)</span>
                            <button onClick={() => del("prerequisites", p.id)} className="text-subtle hover:text-danger" aria-label="Хасах"><X className="h-3.5 w-3.5" /></button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        size={modal?.kind === "lesson" ? "xl" : "md"}
        title={
          modal?.kind === "unit" ? (modal.data ? "Бүлэг засах" : "Шинэ бүлэг") :
          modal?.kind === "topic" ? (modal.data ? "Сэдэв засах" : "Шинэ сэдэв") :
          modal?.kind === "lesson" ? (modal.data ? "Хичээл засах" : "Шинэ хичээл") :
          modal?.kind === "formula" ? "Томьёо" : "Урьдчилсан нөхцөл нэмэх"
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Болих</Button>
            <Button onClick={save} loading={saving}>Хадгалах</Button>
          </>
        }
      >
        {modal?.kind === "unit" && (
          <div className="space-y-4">
            <Field label="Нэр"><Input value={f("title")} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Тайлбар"><Textarea value={f("description")} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Чиглэл">
                <Select value={f("domain")} onChange={(e) => setForm({ ...form, domain: e.target.value })}>
                  {DOMAINS.map((d) => <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>)}
                </Select>
              </Field>
              <Field label="Дараалал"><Input type="number" value={String(form.order ?? 0)} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form.isEnrichment)} onChange={(e) => setForm({ ...form, isEnrichment: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" /> Нэмэлт (хөтөлбөрөөс гадуурх) агуулга</label>
            <label className={cn("flex items-start gap-2 rounded-xl border border-border p-3 text-sm", !isAdmin && "opacity-60")}>
              <input type="checkbox" disabled={!isAdmin} checked={Boolean(form.isOfficial)} onChange={(e) => setForm({ ...form, isOfficial: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
              <span><b>Албан ёсны хөтөлбөртэй тулгаж баталгаажуулсан</b><br /><span className="text-xs text-muted">Зөвхөн Боловсролын яамны баталсан цөм хөтөлбөртэй бүрэн тулгасны дараа тэмдэглэнэ. {!isAdmin && "Зөвхөн админ өөрчилнө."}</span></span>
            </label>
            <Field label="Баталгаажуулалтын тэмдэглэл"><Input value={f("verificationNote")} onChange={(e) => setForm({ ...form, verificationNote: e.target.value })} /></Field>
          </div>
        )}
        {modal?.kind === "topic" && (
          <div className="space-y-4">
            <Field label="Нэр"><Input value={f("title")} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Тайлбар"><Textarea value={f("description")} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></Field>
            <Field label="Дараалал"><Input type="number" value={String(form.order ?? 0)} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></Field>
          </div>
        )}
        {modal?.kind === "formula" && (
          <div className="space-y-4">
            <Field label="Нэр"><Input value={f("title")} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="LaTeX"><Input value={f("latex")} onChange={(e) => setForm({ ...form, latex: e.target.value })} className="font-mono text-sm" /></Field>
            {f("latex") && <div className="rounded-xl bg-surface-2/60 p-3"><Tex tex={f("latex")} display /></div>}
            <Field label="Тайлбар"><Input value={f("description")} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          </div>
        )}
        {modal?.kind === "prereq" && (
          <Field label={`"${modal.topic.title}" сэдвийн өмнө эзэмших сэдэв`}>
            <Select value={f("prerequisiteId")} onChange={(e) => setForm({ ...form, prerequisiteId: e.target.value })}>
              <option value="">— Сонгох —</option>
              {allTopics.filter((x) => x.id !== modal.topic.id && x.grade <= grade).map((x) => <option key={x.id} value={x.id}>{x.grade}-р анги: {x.title}</option>)}
            </Select>
          </Field>
        )}
        {modal?.kind === "lesson" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px]">
              <Field label="Гарчиг"><Input value={f("title")} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Минут"><Input type="number" value={String(form.durationMin ?? 15)} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} /></Field>
              <Field label="Дараалал"><Input type="number" value={String(form.order ?? 0)} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Товч агуулга"><Input value={f("summary")} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
            <div className="grid gap-3 lg:grid-cols-2">
              <Field label="Агуулга (Markdown + $LaTeX$)" hint="## гарчиг, - жагсаалт, **тод**, $$...$$ тусдаа мөрөнд томьёо">
                <Textarea value={f("content")} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={16} className="font-mono text-xs" />
              </Field>
              <div>
                <p className="mb-1.5 text-sm font-medium">Урьдчилан харах</p>
                <div className="h-[372px] overflow-y-auto rounded-xl border border-border p-4"><MathText text={f("content")} /></div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Жишээ бодлогууд</p>
              {examples.map((ex, i) => (
                <div key={i} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Input value={ex.problem} onChange={(e) => setForm({ ...form, examples: examples.map((x, j) => (j === i ? { ...x, problem: e.target.value } : x)) })} placeholder="Бодлого" />
                  <Input value={ex.solution} onChange={(e) => setForm({ ...form, examples: examples.map((x, j) => (j === i ? { ...x, solution: e.target.value } : x)) })} placeholder="Бодолт" />
                  <button onClick={() => setForm({ ...form, examples: examples.filter((_, j) => j !== i) })} className="p-2 text-subtle hover:text-danger" aria-label="Хасах"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, examples: [...examples, { problem: "", solution: "" }] })}><Plus className="h-4 w-4" /> Жишээ</Button>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(form.isPublished)} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" /> Сурагчдад харагдах</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(form.isEnrichment)} onChange={(e) => setForm({ ...form, isEnrichment: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" /> Нэмэлт агуулга</label>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
