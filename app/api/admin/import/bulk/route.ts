import { db } from "@/lib/db";
import { canManageGrade, requireApiRole, STAFF } from "@/lib/auth";
import { audit, fail, ok, rateLimit, route } from "@/lib/api";
import { analyzeBulk } from "@/features/question-import/bulk";
import { createQuestion } from "@/features/question-bank/server";

export const maxDuration = 120;

/** mode=preview: зөвхөн шалгана. mode=commit: зөв мөрүүдийг NEEDS_REVIEW төлөвтэй импортлоно. */
export const POST = route(async (req) => {
  const user = await requireApiRole(STAFF);
  rateLimit(`bulk:${user.id}`, 30, 60 * 60_000);
  const form = await req.formData();
  const file = form.get("file");
  const mode = form.get("mode") === "commit" ? "commit" : "preview";
  if (!(file instanceof File)) return fail(400, "Файл илгээгээгүй байна.");
  if (file.size > 5 * 1024 * 1024) return fail(413, "Файлын хэмжээ 5MB-аас бага байх ёстой.");

  let rows;
  try {
    rows = await analyzeBulk(file.name, Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return fail(400, (e as Error).message);
  }

  if (mode === "preview") {
    return ok({ rows: rows.map(({ data: _d, ...r }) => r), valid: rows.filter((r) => r.ok).length, invalid: rows.filter((r) => !r.ok).length });
  }

  const ext = file.name.split(".").pop()?.toUpperCase() ?? "CSV";
  const job = await db.questionImportJob.create({
    data: { userId: user.id, type: ext === "XLS" ? "XLSX" : ext, fileName: file.name.slice(0, 200), status: "PROCESSING", total: rows.length },
  });
  const errors: { row: number; message: string }[] = rows.filter((r) => !r.ok).map((r) => ({ row: r.row, message: r.errors.join("; ") }));
  let succeeded = 0;
  // Мөр бүрийг тусад нь — нэг мөрийн алдаа бусдыг зогсоохгүй (хэсэгчилсэн импорт)
  for (const r of rows.filter((x) => x.ok && x.data)) {
    try {
      if (!(await canManageGrade(user, r.data!.gradeId))) throw new Error("Энэ ангид импортлох эрхгүй.");
      await createQuestion(r.data!, user, { status: "NEEDS_REVIEW", importJobId: job.id });
      succeeded++;
    } catch (e) {
      errors.push({ row: r.row, message: (e as Error).message });
    }
  }
  const failed = rows.length - succeeded;
  await db.questionImportJob.update({
    where: { id: job.id },
    data: { succeeded, failed, errors: JSON.stringify(errors), status: succeeded === 0 ? "FAILED" : failed > 0 ? "PARTIAL" : "COMPLETED" },
  });
  await audit(user.id, "IMPORT", "question_import_job", job.id, { succeeded, failed });
  return ok({ jobId: job.id, succeeded, failed, errors });
});
