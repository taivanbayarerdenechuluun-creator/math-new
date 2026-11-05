import { db } from "@/lib/db";
import { HttpError, requireApiRole } from "@/lib/auth";
import { route } from "@/lib/api";
import { readUpload } from "@/services/storage";

/** Хадгалсан файлыг эрх шалгаж үзүүлэх: эзэмшигч эсвэл бодлогын санд ажиллах багш/админ */
export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireApiRole();
  const { id } = await params;
  const file = await db.uploadedFile.findUnique({ where: { id } });
  if (!file) throw new HttpError(404, "Файл олдсонгүй.");
  const isOwner = file.userId === user.id;
  const staffCanView = user.role !== "STUDENT" && file.purpose !== "SOLVER";
  // Сурагч зөвхөн нийтлэгдсэн бодлогын лавлах зургийг үзнэ
  const publicQuestionImage =
    file.purpose === "QUESTION_IMAGE" && (await db.question.count({ where: { originalFileId: id, status: "PUBLISHED" } })) > 0;
  if (!isOwner && !staffCanView && !publicQuestionImage) throw new HttpError(404, "Файл олдсонгүй.");
  const buf = await readUpload(file.path);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
});
