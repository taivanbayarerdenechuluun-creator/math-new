// Файл хадгалалт: локал диск (storage/uploads). Нийтэд нээлттэй хавтас биш —
// файлыг зөвхөн эрх шалгасан /api/files/[id] маршрутаар үзүүлнэ.
// Supabase Storage / S3 руу шилжихэд энэ модулийн 3 функцийг солиход хангалттай.
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/auth";
import { IMAGE_MIME, MAX_UPLOAD_BYTES } from "@/lib/constants";

const ROOT = path.resolve(process.env.STORAGE_DIR || "./storage/uploads");

// Файлын эхний байтуудаар бодит төрлийг шалгах (зөвхөн өргөтгөлд найдахгүй)
function sniffMime(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  return null;
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function saveUpload(
  userId: string,
  file: File,
  purpose: "SOLVER" | "QUESTION_IMPORT" | "QUESTION_IMAGE",
  allowed: readonly string[] = IMAGE_MIME,
) {
  if (file.size === 0) throw new HttpError(400, "Файл хоосон байна.");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, `Файлын хэмжээ ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB-аас их байна.`);
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffMime(buf);
  if (!mime || !allowed.includes(mime)) throw new HttpError(415, "Зөвшөөрөгдөөгүй файлын төрөл. JPG, PNG, WebP зураг оруулна уу.");

  const dir = path.join(ROOT, purpose.toLowerCase());
  await fs.mkdir(dir, { recursive: true });
  const name = `${crypto.randomUUID()}.${EXT[mime]}`;
  await fs.writeFile(path.join(dir, name), buf);

  const record = await db.uploadedFile.create({
    data: {
      userId,
      fileName: file.name.slice(0, 200) || name,
      mimeType: mime,
      size: buf.length,
      path: path.posix.join(purpose.toLowerCase(), name),
      purpose,
    },
  });
  return { record, buffer: buf, mime: mime as "image/jpeg" | "image/png" | "image/webp" | "application/pdf" };
}

export async function readUpload(relPath: string): Promise<Buffer> {
  const full = path.resolve(ROOT, relPath);
  if (!full.startsWith(ROOT)) throw new HttpError(400, "Буруу зам.");
  return fs.readFile(full);
}

export async function deleteUpload(relPath: string) {
  const full = path.resolve(ROOT, relPath);
  if (!full.startsWith(ROOT)) return;
  await fs.rm(full, { force: true });
}
