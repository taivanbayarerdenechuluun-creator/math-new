import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Bot,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileStack,
  Flame,
  GraduationCap,
  ScanLine,
  ShieldCheck,
  Sigma,
  Sparkles,
  Target,
  Timer,
  Trophy,
} from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { solveSymbolic } from "@/services/mathematics/solver";
import { Logo } from "@/components/navigation/logo";
import { ThemeToggle } from "@/components/ui/interactive";
import { LinkButton } from "@/components/ui/primitives";
import { MathText, Tex } from "@/components/mathematics/math-text";
import { ParabolaPlayground } from "@/components/dashboard/parabola-playground";
import { DOMAIN_LABELS, type Domain } from "@/lib/constants";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: Sigma, title: "Алхам алхмаар бодогч", text: "Тэгшитгэл, систем, тэнцэтгэл биш, уламжлалыг бодож, алхам бүрийг яагаад хийснийг тайлбарлана." },
  { icon: ShieldCheck, title: "Бие даан шалгасан хариу", text: "Хариу бүрийг тооцооллын хөдөлгүүрээр орлуулж шалгана. Шалгах боломжгүй бол үүнийгээ шударгаар хэлнэ." },
  { icon: Camera, title: "Зургаар бодуулах", text: "Сурах бичгийн бодлогыг утсаараа авахад томьёо, бутархай, язгуурыг таньж LaTeX болгоно." },
  { icon: Bot, title: "AI хувийн багш", text: "Шууд хариу хэлэхийн оронд сануулга, асуултаар чиглүүлж, өөрөөр чинь бодуулна." },
  { icon: ClipboardCheck, title: "Шалгалтын симулятор", text: "Хугацаатай, бодит шалгалтын орчин. Интернэт тасарсан ч хариулт алга болохгүй." },
  { icon: BarChart3, title: "Ахицын шинжилгээ", text: "Хүчтэй, сул сэдэв, нарийвчлал, цуваа — бүгд бодит өгөгдлөөр." },
];

const FAQ = [
  ["IQ MATH хэдэн ангийн сурагчдад зориулагдсан бэ?", "6–12-р ангийн сурагчдад. Анги бүрийн сэдэв, хичээл, бодлого тусдаа бөгөөд урьдчилсан мэдлэгийн дарааллаар нээгдэнэ."],
  ["AI-ийн хариу үргэлж зөв үү?", "Үгүй, AI алдаа гаргаж болно. Тиймээс бид хариуг тооцооллын хөдөлгүүрээр бие даан шалгаж, шалгагдсан эсэхийг тодорхой тэмдэглэдэг. Бодлогын сан дахь бодлогыг багш нар баталгаажуулдаг."],
  ["Хөтөлбөр нь албан ёсны сургалтын хөтөлбөртэй таардаг уу?", "Хөтөлбөрийн бүтцийг багш нар албан ёсны цөм хөтөлбөртэй тулгаж байгаа бөгөөд баталгаажаагүй хэсгийг платформ дээр тодорхой тэмдэглэсэн байдаг."],
  ["Утсаар ашиглаж болох уу?", "Тийм. Бүх хуудас гар утсанд зориулагдсан бөгөөд камераар бодлогын зураг авч болно."],
  ["Миний мэдээлэл хэр найдвартай вэ?", "Бид зөвхөн зайлшгүй мэдээлэл (нэр, имэйл, анги) цуглуулдаг. Та бүртгэл болон бүх өгөгдлөө хүссэн үедээ устгах боломжтой."],
];

export default async function Landing() {
  const user = await getCurrentUser();
  const home = user ? (user.role === "STUDENT" ? "/student" : "/admin") : null;
  const [grades, publishedCount, lessonCount] = await Promise.all([
    db.grade.findMany({ orderBy: { id: "asc" }, include: { units: { orderBy: { order: "asc" }, include: { topics: { orderBy: { order: "asc" }, select: { title: true } } } } } }),
    db.question.count({ where: { status: "PUBLISHED" } }),
    db.lesson.count({ where: { isPublished: true } }),
  ]);
  const demo = solveSymbolic("x^2-5x+6=0");

  return (
    <div className="min-h-dvh bg-bg">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Logo />
          <nav className="hidden flex-1 items-center gap-6 text-sm font-semibold text-muted md:flex" aria-label="Нүүр хуудасны цэс">
            <a href="#features" className="hover:text-fg">Боломжууд</a>
            <a href="#grades" className="hover:text-fg">Хөтөлбөр</a>
            <a href="#solver" className="hover:text-fg">AI бодогч</a>
            <a href="#exams" className="hover:text-fg">Шалгалт</a>
            <a href="#faq" className="hover:text-fg">Түгээмэл асуулт</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {home ? (
              <LinkButton href={home} size="sm">Миний самбар <ArrowRight className="h-4 w-4" /></LinkButton>
            ) : (
              <>
                <LinkButton href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">Нэвтрэх</LinkButton>
                <LinkButton href="/register" size="sm">Үнэгүй эхлэх</LinkButton>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0 bg-grid opacity-[0.12]" style={{ ["--border" as string]: "#8b8fff" }} />
        <div className="absolute -left-32 top-10 h-[28rem] w-[28rem] rounded-full bg-[#5b3df5] opacity-40 blur-[140px]" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#0fb5d4] opacity-25 blur-[140px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
              <Sparkles className="h-3.5 w-3.5 text-[#8fe6f5]" /> 6–12-р анги · Математикийн ухаалаг академи
            </p>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-[3.4rem]">
              Математикийг <span className="bg-gradient-to-r from-[#a594ff] to-[#5ce1f4] bg-clip-text text-transparent">ойлгож</span> сур,
              <br className="hidden sm:block" /> цээжилж биш.
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/70 sm:text-lg">
              Алхам бүрийг тайлбарлах бодогч, чамайг өөрөө бодоход чиглүүлэх AI багш, багш нарын баталгаажуулсан бодлогын сан, бодит шалгалтын симулятор — нэг дор.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href={home ?? "/register"} size="lg" className="bg-white text-navy hover:bg-white/90">
                {home ? "Самбар руу очих" : "Үнэгүй бүртгүүлэх"} <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <a href="#solver" className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 px-6 font-semibold text-white hover:bg-white/10">
                <Sigma className="h-4 w-4" /> Бодогчийг үзэх
              </a>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[
                [String(grades.length), "анги"],
                [String(lessonCount), "хичээл"],
                [String(publishedCount), "баталгаажсан бодлого"],
              ].map(([n, l]) => (
                <div key={l}>
                  <dt className="font-display text-2xl font-semibold">{n}</dt>
                  <dd className="text-xs text-white/55">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <ParabolaPlayground />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">Боломжууд</p>
          <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Хариу биш — ойлголт өгөх платформ</h2>
          <p className="mt-3 text-muted">Сурагч бүрийн түвшинд тааруулсан тайлбар, бие даасан шалгалт, хувийн зөвлөмж.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-3xl border border-border bg-surface p-6 transition-all hover:-translate-y-1 hover:shadow-card">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Grades */}
      <section id="grades" className="scroll-mt-20 border-y border-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary">Хөтөлбөр</p>
              <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">6-аас 12-р анги хүртэл нэг урсгалаар</h2>
              <p className="mt-3 text-muted">Сэдэв бүр өмнөх мэдлэг дээрээ тулгуурлана. Суурь сэдвээ эзэмшсэний дараа дараагийнх нь нээгдэнэ.</p>
            </div>
            <p className="max-w-xs text-xs text-subtle">Хөтөлбөрийн бүтцийг албан ёсны цөм хөтөлбөртэй тулгах ажил үргэлжилж байна — баталгаажаагүй хэсгийг платформ дээр тэмдэглэсэн.</p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {grades.map((g) => (
              <div key={g.id} className="rounded-3xl border border-border bg-bg p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#7c62ff] to-[#14c3e0] font-display text-lg font-semibold text-white">{g.id}</div>
                  <div>
                    <p className="font-semibold">{g.name}</p>
                    <p className="text-xs text-subtle">{g.units.reduce((s, u) => s + u.topics.length, 0)} сэдэв</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-1.5 text-sm text-muted">
                  {g.units.flatMap((u) => u.topics.map((t) => ({ t: t.title, d: u.domain }))).slice(0, 4).map((x) => (
                    <li key={x.t} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{x.t}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-1">
                  {[...new Set(g.units.map((u) => u.domain))].map((d) => (
                    <span key={d} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">{DOMAIN_LABELS[d as Domain]}</span>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-col justify-center rounded-3xl border-2 border-dashed border-border-strong p-5 text-center">
              <GraduationCap className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-2 font-semibold">Тоо, алгебр, геометр, тригонометр, статистик, анализ</p>
              <Link href="/register" className="mt-3 text-sm font-semibold text-primary hover:underline">Эхлэх →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Solver demo */}
      <section id="solver" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-primary">AI бодогч</p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Бодолт бүр 8 хэсэгтэй, хариу бүр шалгагдсан</h2>
            <p className="mt-3 text-muted">Нөхцөл → өгөгдсөн → олох зүйл → томьёо (яагаад энэ томьёо вэ?) → алхмууд → тайлбар → хариу → шалгалт. Баруун талын жишээг манай тооцооллын хөдөлгүүр яг одоо бодлоо.</p>
            <ul className="mt-6 space-y-3 text-sm">
              {["Бичих, зураг оруулах, камер, PDF — 4 аргаар оруулна", "Танигдсан бодлогыг шалгаж засаагүй бол бодохгүй", "Өөр аргаар бодох хувилбарыг харуулна"].map((t) => (
                <li key={t} className="flex gap-2"><BadgeCheck className="h-5 w-5 shrink-0 text-success" /> {t}</li>
              ))}
            </ul>
          </div>
          {demo && (
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-card">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">{demo.topic}</span>
                <span className="flex items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success"><BadgeCheck className="h-3.5 w-3.5" /> Шалгагдсан</span>
              </div>
              <div className="mt-4 text-xl"><MathText text={demo.problem} /></div>
              <ol className="mt-4 space-y-3 border-l-2 border-dashed border-border pl-4">
                {demo.steps.slice(0, 4).map((s, i) => (
                  <li key={i}>
                    <p className="text-sm font-semibold">{i + 1}. {s.title}</p>
                    {s.latex && <div className="mt-1 overflow-x-auto rounded-lg bg-surface-2/60 px-3 py-2 text-sm"><Tex tex={s.latex} /></div>}
                  </li>
                ))}
              </ol>
              <div className="mt-4 rounded-2xl border-2 border-primary/30 bg-primary-soft px-4 py-3"><Tex tex={demo.finalAnswerLatex} display /></div>
            </div>
          )}
        </div>
      </section>

      {/* Camera + exams + analytics */}
      <section id="exams" className="scroll-mt-20 bg-navy py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <ScanLine className="h-8 w-8 text-[#8fe6f5]" />
            <h3 className="mt-4 font-display text-xl font-semibold">Камераар скан</h3>
            <p className="mt-2 text-sm text-white/65">Бодлогоо хүрээнд багтаан зураг ав. Тайрах, эргүүлэх, тодруулах — дараа нь томьёог таньж, чи шалгаад баталгаажуулна.</p>
            <div className="mt-5 rounded-2xl bg-white/5 p-4 font-mono text-xs text-white/70">
              <p className="text-white/40">// танигдсан LaTeX</p>
              <p className="mt-1">\frac{"{3}"}{"{x-1}"} + 2 = \frac{"{x+5}"}{"{x-1}"}</p>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <Timer className="h-8 w-8 text-[#8fe6f5]" />
            <h3 className="mt-4 font-display text-xl font-semibold">Шалгалтын бэлтгэл</h3>
            <p className="mt-2 text-sm text-white/65">Хугацаатай шалгалт, асуултын навигаци, &quot;дахин харах&quot; тэмдэглэгээ, автомат хадгалалт. Дууссаны дараа сэдэв, түвшин бүрээр задлан шинжилнэ.</p>
            <div className="mt-5 grid grid-cols-5 gap-1.5">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className={`grid h-8 place-items-center rounded-lg text-xs font-bold ${i < 6 ? "bg-[#7c62ff]" : i === 6 ? "bg-amber-400 text-navy" : "bg-white/10"}`}>{i + 1}</div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <Trophy className="h-8 w-8 text-[#8fe6f5]" />
            <h3 className="mt-4 font-display text-xl font-semibold">Ахиц ба урам</h3>
            <p className="mt-2 text-sm text-white/65">XP, түвшин, өдрийн цуваа, амжилтын тэмдэг. Сул сэдэвт тань тохирсон хичээл, дасгалыг санал болгоно.</p>
            <div className="mt-5 flex items-center gap-4 rounded-2xl bg-white/5 p-4">
              <Flame className="h-8 w-8 text-amber-400" />
              <div className="flex-1">
                <div className="flex justify-between text-xs text-white/60"><span>Түвшин 4</span><span>720 XP</span></div>
                <div className="mt-1.5 h-2 rounded-full bg-white/10"><div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#8d77ff] to-[#5ce1f4]" /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For teachers */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-10 rounded-[2rem] border border-border bg-surface p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-primary">Багш нарт</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">Бодлогын сангаа нэг дор, баталгаатай удирдах</h2>
            <p className="mt-3 text-muted">Гараар, зургаас, PDF-ээс эсвэл Excel-ээр импортлоод хуваагдсан дэлгэц дээр эх сурвалжтай тулгаж баталгаажуулна. Зөвхөн баталгаажсан бодлого сурагчдад хүрнэ.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              [FileStack, "Төвлөрсөн сан", "Анги, сэдэв, түвшин, төлөвөөр"],
              [ScanLine, "OCR импорт", "Зураг, скан, PDF"],
              [ShieldCheck, "Хоёр шатны хяналт", "Ноорог → хянах → баталгаажих → нийтлэх"],
              [Target, "Шалгалт үүсгэх", "Хүндрэлийн хуваарилалтаар"],
            ].map(([I, t, d]) => {
              const Icon = I as typeof FileStack;
              return (
                <div key={t as string} className="rounded-2xl bg-surface-2/60 p-4">
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="mt-2 text-sm font-semibold">{t as string}</p>
                  <p className="text-xs text-muted">{d as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Membership — үнийн мэдээлэл зохиохгүй */}
      <section className="mx-auto max-w-3xl px-4 pb-20 text-center sm:px-6">
        <BookOpen className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-4 font-display text-3xl font-semibold">Одоо үнэгүй эхэл</h2>
        <p className="mt-3 text-muted">Сурагчийн бүртгэл үнэгүй. Сургууль, багш нарт зориулсан хамтын ажиллагааны талаар админтай холбогдоно уу.</p>
        <LinkButton href={home ?? "/register"} size="lg" className="mt-6">{home ? "Самбар руу очих" : "Бүртгүүлэх"} <ArrowRight className="h-4 w-4" /></LinkButton>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-border bg-surface py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center font-display text-3xl font-semibold">Түгээмэл асуулт</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-border bg-bg px-5 py-4 open:shadow-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {q}
                  <span className="text-xl text-subtle transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Logo />
            <p className="mt-2 text-sm text-muted">Learn. Practice. Understand. Master.</p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-muted">
            <Link href="/privacy" className="hover:text-fg">Нууцлалын бодлого</Link>
            <Link href="/terms" className="hover:text-fg">Үйлчилгээний нөхцөл</Link>
            <Link href="/login" className="hover:text-fg">Нэвтрэх</Link>
          </div>
          <p className="text-xs text-subtle">© {new Date().getFullYear()} IQ MATH</p>
        </div>
      </footer>
    </div>
  );
}
