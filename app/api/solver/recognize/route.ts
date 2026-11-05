import { requireApiRole } from "@/lib/auth";
import { fail, ok, rateLimit, route } from "@/lib/api";
import { saveUpload } from "@/services/storage";
import { recognizeMath } from "@/services/ocr";
import { describeAiError } from "@/services/ai/anthropic";

export const maxDuration = 90;

/** Зураг хүлээн авч хадгалаад OCR хийнэ. OCR амжилтгүй бол файл хадгалагдсан хэвээр — сурагч гараар бичиж болно. */
export const POST = route(async (req) => {
  const user = await requireApiRole();
  rateLimit(`ocr:${user.id}`, 20, 60 * 60_000);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail(400, "Зураг илгээгээгүй байна.");
  const purpose = form.get("purpose") === "QUESTION_IMPORT" && user.role !== "STUDENT" ? "QUESTION_IMPORT" : "SOLVER";
  const { record, buffer, mime } = await saveUpload(user.id, file, purpose);

  try {
    const ocr = await recognizeMath(buffer.toString("base64"), mime as "image/jpeg" | "image/png" | "image/webp");
    if (ocr.questions.length === 0) {
      return ok({ fileId: record.id, ocr, warning: "Зурагнаас математикийн бодлого олдсонгүй. Зураг тод эсэхийг шалгах эсвэл гараар бичнэ үү." });
    }
    return ok({ fileId: record.id, ocr });
  } catch (err) {
    const { status, message } = describeAiError(err);
    return ok({ fileId: record.id, ocr: null, error: message, errorStatus: status });
  }
});
