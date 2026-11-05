import { requirePageRole, STAFF } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell, type NavItem } from "@/components/navigation/app-shell";
import { ROLE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(STAFF);
  const pending = await db.question.count({ where: { status: "NEEDS_REVIEW" } });
  const isAdmin = user.role === "ADMIN";

  const nav: NavItem[] = [
    { href: "/admin", label: "Хянах самбар", icon: "dashboard", mobile: true },
    { href: "/admin/questions", label: "Бодлогын сан", icon: "questions", mobile: true },
    { href: "/admin/questions/new", label: "Шинэ бодлого", icon: "new" },
    { href: "/admin/import", label: "Импорт", icon: "import", mobile: true },
    { href: "/admin/review", label: "Хянах дараалал", icon: "review", badge: pending || undefined, mobile: true },
    { href: "/admin/curriculum", label: "Хөтөлбөр", icon: "curriculum" },
    { href: "/admin/exams", label: "Шалгалт", icon: "exams" },
    { href: "/admin/students", label: "Сурагчдын гүйцэтгэл", icon: "progress" },
    ...(isAdmin
      ? ([
          { href: "/admin/users", label: "Хэрэглэгчид", icon: "users" },
          { href: "/admin/analytics", label: "Шинжилгээ", icon: "analytics" },
          { href: "/admin/audit", label: "Аудит лог", icon: "audit" },
        ] as NavItem[])
      : []),
    { href: "/admin/profile", label: "Профайл", icon: "profile" },
  ];

  return (
    <AppShell nav={nav} user={{ name: user.name, email: user.email, avatarColor: user.avatarColor }}roleLabel={ROLE_LABELS[user.role]} homeHref="/admin">
      {children}
    </AppShell>
  );
}
