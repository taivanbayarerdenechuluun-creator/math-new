"use client";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Bot, Compass, Lightbulb, MessageSquarePlus, PanelLeft, Send, Shuffle, Sparkles, Trash2, TrendingDown, TrendingUp, UserCheck, X } from "lucide-react";
import { Alert, Avatar, Button, Card, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { MathText } from "@/components/mathematics/math-text";
import { api, ApiError } from "@/lib/client";
import { EXPLAIN_MODE_LABELS, type ExplainMode } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

interface Convo {
  id: string;
  title: string;
  mode: ExplainMode;
  guided: boolean;
  updatedAt: string;
}
interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK = [
  { icon: Lightbulb, label: "Сануулга өгөөч", text: "Бүтэн бодолтыг бүү хэл, зөвхөн дараагийн алхмын сануулга өгөөч." },
  { icon: TrendingDown, label: "Хялбар жишээ", text: "Энэ сэдвээр илүү хялбар жишээ өгч тайлбарлаач." },
  { icon: TrendingUp, label: "Хүнд жишээ", text: "Энэ сэдвээр илүү хүнд бодлого өгөөч. Хариуг нь эхлээд бүү хэл." },
  { icon: Shuffle, label: "Төстэй бодлого", text: "Үүнтэй төстэй 3 бодлого зохиож өгөөч. Хариуг хамгийн сүүлд тусад нь бич." },
  { icon: Compass, label: "Өөр арга", text: "Энэ бодлогыг өөр аргаар бодож тайлбарлаач." },
  { icon: UserCheck, label: "Миний бодолтыг шалга", text: "Миний бодолтыг шалгаад алдаа байвал хаана гарсныг зааж өгөөч:\n" },
];

export function TutorClient({ aiReady, defaultMode, grade }: { aiReady: boolean; defaultMode: ExplainMode; grade: number | null }) {
  const params = useSearchParams();
  const toast = useToast();
  const [convos, setConvos] = React.useState<Convo[]>([]);
  const [active, setActive] = React.useState<Convo | null>(null);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [mode, setMode] = React.useState<ExplainMode>(defaultMode);
  const [guided, setGuided] = React.useState(true);
  const [sidebar, setSidebar] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const loadConvos = React.useCallback(async () => {
    const r = await api<{ items: Convo[] }>("/api/tutor/conversations").catch(() => ({ items: [] }));
    setConvos(r.items);
  }, []);

  React.useEffect(() => {
    loadConvos();
    const problem = params.get("problem");
    const topic = params.get("topic");
    if (problem) setInput(`Энэ бодлогыг ойлгоход тусална уу:\n${problem}`);
    else if (topic) setInput(`"${topic}" сэдвийг энгийнээр тайлбарлаж өгөөч.`);
  }, [loadConvos, params]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const open = async (c: Convo) => {
    setSidebar(false);
    const r = await api<{ conversation: Convo; messages: Msg[] }>(`/api/tutor/conversations/${c.id}`);
    setActive(r.conversation);
    setMode(r.conversation.mode);
    setGuided(r.conversation.guided);
    setMessages(r.messages);
  };

  const newChat = () => {
    setActive(null);
    setMessages([]);
    setSidebar(false);
  };

  const updateSettings = async (patch: { mode?: ExplainMode; guided?: boolean }) => {
    if (patch.mode) setMode(patch.mode);
    if (patch.guided !== undefined) setGuided(patch.guided);
    if (active) await api(`/api/tutor/conversations/${active.id}`, { method: "PATCH", json: patch }).catch(() => null);
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setStreaming(true);
    setInput("");
    try {
      let convo = active;
      if (!convo) {
        convo = await api<Convo>("/api/tutor/conversations", { method: "POST", json: { mode, guided } });
        setActive(convo);
      }
      const userMsg: Msg = { id: `u${Date.now()}`, role: "user", content };
      const botId = `a${Date.now()}`;
      setMessages((m) => [...m, userMsg, { id: botId, role: "assistant", content: "" }]);

      const res = await fetch(`/api/tutor/conversations/${convo.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new ApiError(res.status, (data as { error?: string }).error ?? "Алдаа гарлаа.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => m.map((x) => (x.id === botId ? { ...x, content: acc } : x)));
      }
      loadConvos();
    } catch (e) {
      // Илгээж чадаагүй мессежийг буцааж талбарт хийнэ — сурагчийн бичсэн зүйл алга болохгүй
      setInput(content);
      setMessages((m) => m.filter((x) => x.content !== "" || x.role !== "assistant"));
      toast({ tone: "error", title: (e as Error).message });
    } finally {
      setStreaming(false);
    }
  };

  const remove = async (id: string) => {
    await api(`/api/tutor/conversations/${id}`, { method: "DELETE" }).catch(() => null);
    if (active?.id === id) newChat();
    loadConvos();
  };

  const ConvoList = (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button className="w-full" onClick={newChat}>
          <MessageSquarePlus className="h-4 w-4" /> Шинэ яриа
        </Button>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {convos.length === 0 && <p className="px-3 py-6 text-center text-sm text-subtle">Өмнөх яриа алга</p>}
        {convos.map((c) => (
          <div key={c.id} className={cn("group flex items-center gap-1 rounded-xl", active?.id === c.id ? "bg-primary-soft" : "hover:bg-surface-2")}>
            <button onClick={() => open(c)} className="min-w-0 flex-1 px-3 py-2.5 text-left">
              <p className={cn("truncate text-sm font-semibold", active?.id === c.id && "text-primary")}>{c.title}</p>
              <p className="text-xs text-subtle">{formatDate(c.updatedAt)}</p>
            </button>
            <button onClick={() => remove(c.id)} className="mr-1 rounded-lg p-1.5 text-subtle opacity-0 hover:text-danger group-hover:opacity-100 focus:opacity-100" aria-label="Устгах">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="-mt-2 grid h-[calc(100dvh-9.5rem)] gap-4 lg:h-[calc(100dvh-7.5rem)] lg:grid-cols-[260px_1fr]">
      <Card className="hidden overflow-hidden lg:block">{ConvoList}</Card>
      {sidebar && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/50" onClick={() => setSidebar(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-surface">
            <div className="flex justify-end p-2">
              <button onClick={() => setSidebar(false)} className="p-2" aria-label="Хаах">
                <X className="h-5 w-5" />
              </button>
            </div>
            {ConvoList}
          </div>
        </div>
      )}

      <Card className="flex min-h-0 flex-col overflow-hidden">
        {/* Тохиргоо */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
          <button onClick={() => setSidebar(true)} className="rounded-lg p-2 text-muted hover:bg-surface-2 lg:hidden" aria-label="Яриануудын жагсаалт">
            <PanelLeft className="h-5 w-5" />
          </button>
          <div className="flex rounded-lg bg-surface-2 p-0.5" role="radiogroup" aria-label="Тайлбарын түвшин">
            {(Object.keys(EXPLAIN_MODE_LABELS) as ExplainMode[]).map((m) => (
              <button key={m} onClick={() => updateSettings({ mode: m })} className={cn("rounded-md px-2.5 py-1.5 text-xs font-semibold", mode === m ? "bg-surface text-fg shadow-soft" : "text-muted")} role="radio" aria-checked={mode === m}>
                {EXPLAIN_MODE_LABELS[m]}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg bg-surface-2 p-0.5" role="radiogroup" aria-label="Заах арга">
            <button onClick={() => updateSettings({ guided: true })} className={cn("rounded-md px-2.5 py-1.5 text-xs font-semibold", guided ? "bg-surface text-fg shadow-soft" : "text-muted")} role="radio" aria-checked={guided}>
              Чиглүүлэх
            </button>
            <button onClick={() => updateSettings({ guided: false })} className={cn("rounded-md px-2.5 py-1.5 text-xs font-semibold", !guided ? "bg-surface text-fg shadow-soft" : "text-muted")} role="radio" aria-checked={!guided}>
              Шууд тайлбар
            </button>
          </div>
          {grade && <span className="ml-auto hidden text-xs text-subtle sm:block">{grade}-р ангийн түвшинд</span>}
        </div>

        {/* Мессежүүд */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6" aria-live="polite">
          {!aiReady && (
            <Alert tone="warning" className="mb-4" title="AI багш тохируулагдаагүй байна">
              Админ серверийн .env файлд ANTHROPIC_API_KEY-г тохируулсны дараа ажиллана. Тэр болтол &quot;Бодлого бодох&quot; хэсгийн тооцооллын хөдөлгүүрийг ашиглаарай.
            </Alert>
          )}
          {messages.length === 0 ? (
            <div className="mx-auto flex max-w-xl flex-col items-center pt-6 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-[#7c62ff] to-[#14c3e0] text-white shadow-float">
                <Bot className="h-8 w-8" />
              </div>
              <h2 className="mt-4 font-display text-xl font-semibold">Сайн уу! Би чиний математикийн багш.</h2>
              <p className="mt-2 text-sm text-muted">
                {guided ? "Чиглүүлэх горимд би шууд хариу хэлэхгүй — асуулт, сануулгаар чамайг өөрөө бодоход тусална." : "Шууд тайлбарын горимд бодлогыг алхам алхмаар бүрэн тайлбарлана."}
              </p>
              <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                {["Квадрат тэгшитгэлийг хэрхэн бодох вэ?", "Логарифм гэж юу вэ? Энгийнээр тайлбарлаач", "Пифагорын теоремыг яаж баталдаг вэ?", "Уламжлал бодит амьдралд хаана хэрэглэгддэг вэ?"].map((s) => (
                  <button key={s} onClick={() => send(s)} disabled={!aiReady} className="rounded-xl border border-border p-3 text-left text-sm hover:border-primary/40 hover:bg-primary-soft/30 disabled:opacity-50">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
                  {m.role === "assistant" ? (
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#7c62ff] to-[#14c3e0] text-white">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  ) : (
                    <Avatar name="Би" size={32} />
                  )}
                  <div className={cn("min-w-0 max-w-[85%] rounded-2xl px-4 py-3", m.role === "user" ? "bg-primary text-white" : "bg-surface-2/70")}>
                    {m.content ? (
                      m.role === "user" ? <p className="whitespace-pre-wrap text-sm">{m.content}</p> : <MathText text={m.content} className="text-[0.95rem]" />
                    ) : (
                      <div className="flex gap-1 py-1.5">
                        {[0, 1, 2].map((d) => (
                          <motion.span key={d} className="h-2 w-2 rounded-full bg-subtle" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }} />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Оролт */}
        <div className="border-t border-border p-3 sm:p-4">
          {messages.length > 0 && (
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {QUICK.map((q) => (
                <button
                  key={q.label}
                  disabled={streaming || !aiReady}
                  onClick={() => (q.text.endsWith("\n") ? setInput(q.text) : send(q.text))}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted hover:border-primary/40 hover:text-fg disabled:opacity-50"
                >
                  <q.icon className="h-3.5 w-3.5" /> {q.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              className="max-h-40 min-h-11 resize-none"
              placeholder="Асуултаа бичнэ үү… (томьёог $x^2$ гэж бичиж болно)"
              disabled={!aiReady}
              aria-label="Мессеж"
            />
            <Button size="icon" onClick={() => send()} loading={streaming} disabled={!input.trim() || !aiReady} aria-label="Илгээх" className="h-11 w-11 shrink-0">
              {!streaming && <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-subtle">AI алдаа гаргаж болно. Чухал хариуг багш эсвэл сурах бичгээрээ нягтлаарай.</p>
        </div>
      </Card>
    </div>
  );
}
