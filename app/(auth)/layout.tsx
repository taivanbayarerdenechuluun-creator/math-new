import { Logo } from "@/components/navigation/logo";
import { ThemeToggle } from "@/components/ui/interactive";
import { Tex } from "@/components/mathematics/math-text";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-navy text-white lg:block">
        <div className="absolute inset-0 opacity-[0.12] bg-grid" style={{ ["--border" as string]: "#8b8fff" }} />
        <div className="absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-[#5b3df5] opacity-40 blur-[120px]" />
        <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-[#0fb5d4] opacity-30 blur-[120px]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo className="text-white" />
          <div className="max-w-md">
            <h2 className="font-display text-4xl font-semibold leading-tight">
              Ойлгож сур.
              <br />
              Дадлагаар бэхжүүл.
              <br />
              <span className="text-[#8fe6f5]">Итгэлтэй давж гар.</span>
            </h2>
            <p className="mt-5 text-base text-white/70">6–12-р ангийн математикийг алхам алхмаар тайлбарлах AI багш, бодлогын сан, шалгалтын бэлтгэл нэг дор.</p>
            <div className="mt-10 grid grid-cols-2 gap-3 text-sm">
              {[
                ["x_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a}", "Квадрат тэгшитгэл"],
                ["\\int_0^2 (2x+1)\\,dx = 6", "Интеграл"],
                ["\\sin^2\\alpha + \\cos^2\\alpha = 1", "Тригонометр"],
                ["c^2 = a^2 + b^2", "Пифагор"],
              ].map(([t, l]) => (
                <div key={l} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <Tex tex={t} className="block overflow-x-auto text-[0.95rem]" />
                  <p className="mt-2 text-xs text-white/50">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-white/40">© {new Date().getFullYear()} IQ MATH</p>
        </div>
      </aside>
      <main className="relative flex flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <Logo className="lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
