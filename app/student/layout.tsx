import { requirePageRole } from "@/lib/auth";
import { AppShell, type NavItem } from "@/components/navigation/app-shell";

export const dynamic = "force-dynamic";

const NAV: NavItem[] = [
  { href: "/student", label: "Нүүр хуудас", icon: "home", mobile: true },
  { href: "/student/learn", label: "Суралцах", icon: "learn", mobile: true },
  { href: "/student/solve", label: "Бодлого бодох", icon: "solve", mobile: true },
  { href: "/student/tutor", label: "AI багш", icon: "tutor", mobile: true },
  { href: "/student/practice", label: "Дасгал", icon: "practice" },
  { href: "/student/exams", label: "Шалгалт", icon: "exams" },
  { href: "/student/progress", label: "Миний ахиц", icon: "progress" },
  { href: "/student/saved", label: "Хадгалсан бодлого", icon: "saved" },
  { href: "/student/profile", label: "Профайл", icon: "profile" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["STUDENT"]);
  return (
    <AppShell nav={NAV} user={{ name: user.name, email: user.email, avatarColor: user.avatarColor }}roleLabel={user.grade ? `${user.grade}-р ангийн сурагч` : "Сурагч"} homeHref="/student">
      {children}
    </AppShell>
  );
}
