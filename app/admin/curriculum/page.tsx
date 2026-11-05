import Link from "next/link";
import { requirePageRole, STAFF } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/primitives";
import { GRADES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { CurriculumManager } from "./curriculum-manager";

export const metadata = { title: "Хөтөлбөр" };

export default async function CurriculumPage({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const user = await requirePageRole(STAFF);
  const grade = Number((await searchParams).grade) || 9;
  const [units, allTopics] = await Promise.all([
    db.curriculumUnit.findMany({
      where: { gradeId: grade },
      orderBy: { order: "asc" },
      include: {
        topics: {
          orderBy: { order: "asc" },
          include: {
            lessons: { orderBy: { order: "asc" } },
            formulas: true,
            prerequisites: { include: { prerequisite: { select: { id: true, title: true, unit: { select: { gradeId: true } } } } } },
            _count: { select: { questions: true } },
          },
        },
      },
    }),
    db.topic.findMany({ select: { id: true, title: true, unit: { select: { gradeId: true } } }, orderBy: [{ unit: { gradeId: "asc" } }, { order: "asc" }] }),
  ]);

  return (
    <div>
      <PageHeader eyebrow="Контент" title="Сургалтын хөтөлбөр" description="Анги → бүлэг → сэдэв → хичээл, томьёо, урьдчилсан нөхцөлийг удирдана. Албан ёсны хөтөлбөртэй тулгасан бүлгийг админ баталгаажуулна." />
      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
        {GRADES.map((g) => (
          <Link key={g} href={`/admin/curriculum?grade=${g}`} className={cn("h-9 shrink-0 rounded-lg border px-3 text-sm font-semibold leading-9", g === grade ? "border-primary bg-primary text-white" : "border-border bg-surface text-muted hover:text-fg")}>
            {g}-р анги
          </Link>
        ))}
      </div>
      <CurriculumManager grade={grade} units={JSON.parse(JSON.stringify(units))} allTopics={allTopics.map((t) => ({ id: t.id, title: t.title, grade: t.unit.gradeId }))} isAdmin={user.role === "ADMIN"} />
    </div>
  );
}
