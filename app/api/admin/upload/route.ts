import { requireApiRole, STAFF } from "@/lib/auth";
import { fail, ok, rateLimit, route } from "@/lib/api";
import { saveUpload } from "@/services/storage";

/** Бодлогын лавлах зураг (дүрс, график) хадгалах */
export const POST = route(async (req) => {
  const user = await requireApiRole(STAFF);
  rateLimit(`upload:${user.id}`, 100, 60 * 60_000);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail(400, "Файл илгээгээгүй байна.");
  const { record } = await saveUpload(user.id, file, "QUESTION_IMAGE");
  return ok({ fileId: record.id });
});
