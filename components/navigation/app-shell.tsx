"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  BookOpen,
  Bookmark,
  Bot,
  ClipboardCheck,
  FileStack,
  FileUp,
  GraduationCap,
  Home,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  PlusCircle,
  ScrollText,
  Sigma,
  Target,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import { Logo } from "./logo";
import { Avatar } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/interactive";
import { api } from "@/lib/client";
import { cn, formatDateTime } from "@/lib/utils";

const ICONS = {
  home: Home,
  learn: BookOpen,
  solve: Sigma,
  tutor: Bot,
  exams: ClipboardCheck,
  progress: TrendingUp,
  saved: Bookmark,
  profile: User,
  practice: Target,
  dashboard: LayoutDashboard,
  questions: FileStack,
  new: PlusCircle,
  import: FileUp,
  review: ListChecks,
  curriculum: GraduationCap,
  users: Users,
  analytics: BarChart3,
  audit: ScrollText,
} as const;
export type IconName = keyof typeof ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
  mobile?: boolean; // гар утасны доод цэсэнд харуулах
}

interface Notification {
  id: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Notification[] | null>(null);
  const router = useRouter();
  const unread = items?.filter((n) => !n.read).length ?? 0;

  const load = React.useCallback(() => {
    api<{ items: Notification[] }>("/api/notifications")
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, []);
  React.useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const markAll = async () => {
    await api("/api/notifications", { method: "PATCH", json: { all: true } }).catch(() => null);
    load();
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg" aria-label={`Мэдэгдэл${unread ? ` (${unread} шинэ)` : ""}`}>
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-float"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold">Мэдэгдэл</p>
                {unread > 0 && (
                  <button onClick={markAll} className="text-xs font-semibold text-primary hover:underline">
                    Бүгдийг уншсан
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {!items?.length ? (
                  <p className="px-4 py-8 text-center text-sm text-muted">Мэдэгдэл алга байна</p>
                ) : (
                  items.map((n) => (
                    <button
                      key={n.id}
                      onClick={async () => {
                        setOpen(false);
                        if (!n.read) await api("/api/notifications", { method: "PATCH", json: { id: n.id } }).catch(() => null);
                        load();
                        if (n.link) router.push(n.link);
                      }}
                      className={cn("block w-full border-b border-border px-4 py-3 text-left last:border-0 hover:bg-surface-2", !n.read && "bg-primary-soft/40")}
                    >
                      <p className="text-sm font-semibold">{n.title}</p>
                      <p className="mt-0.5 text-sm text-muted">{n.body}</p>
                      <p className="mt-1 text-xs text-subtle">{formatDateTime(n.createdAt)}</p>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AppShell({
  nav,
  user,
  roleLabel,
  homeHref,
  children,
}: {
  nav: NavItem[];
  user: { name: string; email: string; avatarColor: string };
  roleLabel: string;
  homeHref: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = React.useState(false);
  React.useEffect(() => setDrawer(false), [pathname]);

  const isActive = (href: string) => (href === homeHref ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/login");
    router.refresh();
  };

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-0.5" aria-label="Үндсэн цэс">
      {nav.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
            aria-current={active ? "page" : undefined}
          >
            {active && <motion.span layoutId="nav-active" className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary" />}
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge ? <span className="rounded-full bg-warning px-2 py-0.5 text-[11px] font-bold text-white">{item.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );

  const mobileItems = nav.filter((n) => n.mobile).slice(0, 4);

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo href={homeHref} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <NavList />
        </div>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <Avatar name={user.name} color={user.avatarColor} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-subtle">{roleLabel}</p>
            </div>
            <button onClick={logout} className="rounded-lg p-2 text-subtle hover:bg-surface-2 hover:text-danger" aria-label="Гарах" title="Гарах">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur-md sm:px-6">
        <button onClick={() => setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-surface-2 lg:hidden" aria-label="Цэс нээх">
          <Menu className="h-5 w-5" />
        </button>
        <Logo href={homeHref} className="lg:hidden" compact />
        <div className="flex-1" />
        <ThemeToggle />
        <NotificationBell />
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-navy/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-surface"
            >
              <div className="flex h-16 items-center justify-between px-5">
                <Logo href={homeHref} />
                <button onClick={() => setDrawer(false)} className="rounded-lg p-1.5 text-muted hover:bg-surface-2" aria-label="Хаах">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3">
                <NavList onNavigate={() => setDrawer(false)} />
              </div>
              <div className="border-t border-border p-3">
                <div className="flex items-center gap-3 p-2">
                  <Avatar name={user.name} color={user.avatarColor} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-subtle">{user.email}</p>
                  </div>
                </div>
                <button onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-danger hover:bg-danger-soft">
                  <LogOut className="h-4 w-4" /> Гарах
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">{children}</main>

      {/* Mobile bottom navigation */}
      {mobileItems.length > 0 && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden" aria-label="Доод цэс">
          <div className="grid grid-cols-5">
            {mobileItems.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", active ? "text-primary" : "text-subtle")}>
                  <Icon className="h-5 w-5" />
                  <span className="max-w-full truncate px-1">{item.label}</span>
                </Link>
              );
            })}
            <button onClick={() => setDrawer(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-subtle">
              <Menu className="h-5 w-5" />
              Бусад
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
