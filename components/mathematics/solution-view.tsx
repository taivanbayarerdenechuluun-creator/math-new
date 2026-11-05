"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { BadgeCheck, BookOpenCheck, ChevronDown, ClipboardList, Cpu, FlaskConical, Lightbulb, Search, ShieldAlert, ShieldQuestion, Sigma, Target } from "lucide-react";
import type { SolutionResult } from "@/types/math";
import { Badge, Card } from "@/components/ui/primitives";
import { MathText, Tex } from "./math-text";
import { cn } from "@/lib/utils";

function Section({ icon, title, children, n }: { icon: React.ReactNode; title: string; children: React.ReactNode; n: number }) {
  return (
    <section className="relative pl-11">
      <div className="absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-xl bg-primary-soft text-primary">{icon}</div>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
        <span className="text-subtle">{n}.</span> {title}
      </h3>
      <div className="mt-2 text-[0.95rem] text-fg">{children}</div>
    </section>
  );
}

export function VerificationBadge({ v, engine }: { v: SolutionResult["verification"]; engine: SolutionResult["engine"] }) {
  if (v === "VERIFIED")
    return (
      <Badge tone="success">
        <BadgeCheck className="h-3.5 w-3.5" /> Шалгагдсан
      </Badge>
    );
  if (v === "MISMATCH")
    return (
      <Badge tone="danger">
        <ShieldAlert className="h-3.5 w-3.5" /> Зөрүүтэй
      </Badge>
    );
  return (
    <Badge tone="warning">
      <ShieldQuestion className="h-3.5 w-3.5" /> {engine === "AI" ? "AI — шалгагдаагүй" : "Шалгагдаагүй"}
    </Badge>
  );
}

const ENGINE_LABEL: Record<SolutionResult["engine"], string> = {
  SYMBOLIC: "Тооцооллын хөдөлгүүр",
  AI: "AI багш",
  "AI+SYMBOLIC": "AI + Тооцооллын шалгалт",
};

export function SolutionView({ s }: { s: SolutionResult }) {
  const [openAlt, setOpenAlt] = React.useState<number | null>(null);
  let n = 0;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2/60 px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">{s.topic}</Badge>
            <Badge tone="neutral">
              <Cpu className="h-3.5 w-3.5" /> {ENGINE_LABEL[s.engine]}
            </Badge>
          </div>
          <VerificationBadge v={s.verification} engine={s.engine} />
        </div>

        <div className="space-y-7 p-5 sm:p-6">
          <Section n={++n} icon={<ClipboardList className="h-4 w-4" />} title="Бодлогын нөхцөл">
            <MathText text={s.problem} className="text-lg" />
          </Section>

          {s.given.length > 0 && (
            <Section n={++n} icon={<Search className="h-4 w-4" />} title="Өгөгдсөн">
              <ul className="space-y-1">
                {s.given.map((g, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-subtle">•</span>
                    <MathText text={g} inline />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section n={++n} icon={<Target className="h-4 w-4" />} title="Олох зүйл">
            <MathText text={s.find} inline />
          </Section>

          {s.formulas.length > 0 && (
            <Section n={++n} icon={<Sigma className="h-4 w-4" />} title="Ашиглах томьёо">
              <div className="grid gap-2 sm:grid-cols-2">
                {s.formulas.map((f, i) => (
                  <div key={i} className="rounded-xl border border-border bg-surface-2/50 px-3.5 py-2.5">
                    <p className="text-xs font-medium text-muted">{f.name}</p>
                    <Tex tex={f.latex} className="mt-1 block overflow-x-auto" />
                  </div>
                ))}
              </div>
              {s.methodReason && (
                <p className="mt-3 flex gap-2 rounded-xl bg-info-soft px-3.5 py-2.5 text-sm text-fg">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                  <span>
                    <span className="font-semibold">Яагаад энэ арга вэ? </span>
                    <MathText text={s.methodReason} inline />
                  </span>
                </p>
              )}
            </Section>
          )}

          <Section n={++n} icon={<BookOpenCheck className="h-4 w-4" />} title="Бодолтын алхмууд">
            <ol className="relative space-y-4 border-l-2 border-dashed border-border pl-5">
              {s.steps.map((st, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} className="relative">
                  <span className="absolute -left-[31px] top-0 grid h-5 w-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">{i + 1}</span>
                  <p className="font-semibold">{st.title}</p>
                  {st.latex && (
                    <div className="my-2 overflow-x-auto rounded-xl bg-surface-2/60 px-4 py-3">
                      <Tex tex={st.latex} display />
                    </div>
                  )}
                  <MathText text={st.explanation} className="text-sm text-muted" />
                </motion.li>
              ))}
            </ol>
          </Section>

          <Section n={++n} icon={<BadgeCheck className="h-4 w-4" />} title="Эцсийн хариу">
            <div className="rounded-2xl border-2 border-primary/30 bg-primary-soft px-5 py-4 text-lg">
              <Tex tex={s.finalAnswerLatex} display />
            </div>
          </Section>

          <Section n={++n} icon={<FlaskConical className="h-4 w-4" />} title="Хариуг шалгах">
            <MathText text={s.check.method} className="text-sm text-muted" />
            {s.check.steps.length > 0 && (
              <div className="mt-2 space-y-1.5 overflow-x-auto rounded-xl bg-surface-2/60 px-4 py-3">
                {s.check.steps.map((c, i) => (
                  <div key={i}>
                    <Tex tex={c} />
                  </div>
                ))}
              </div>
            )}
            <p
              className={cn(
                "mt-3 rounded-xl px-3.5 py-2.5 text-sm",
                s.verification === "VERIFIED" ? "bg-success-soft text-success" : s.verification === "MISMATCH" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning",
              )}
            >
              {s.verificationNote}
            </p>
          </Section>

          {s.alternatives && s.alternatives.length > 0 && (
            <div className="space-y-2 border-t border-border pt-5">
              <p className="text-sm font-semibold">Өөр бодох арга</p>
              {s.alternatives.map((alt, ai) => (
                <div key={ai} className="rounded-xl border border-border">
                  <button className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold" onClick={() => setOpenAlt(openAlt === ai ? null : ai)} aria-expanded={openAlt === ai}>
                    {alt.title}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", openAlt === ai && "rotate-180")} />
                  </button>
                  {openAlt === ai && (
                    <div className="space-y-3 border-t border-border px-4 py-3">
                      {alt.steps.map((st, i) => (
                        <div key={i}>
                          <p className="text-sm font-semibold">{st.title}</p>
                          {st.latex && <Tex tex={st.latex} display />}
                          <MathText text={st.explanation} className="text-sm text-muted" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
