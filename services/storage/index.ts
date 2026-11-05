// Файл хадгалалт — хоёр драйвер:
//   local: storage/uploads (нийтэд нээлттэй хавтас биш)
//   db:    файлын агуулгыг UploadedFile.data баганад (Vercel зэрэг диск нь түр зуурын орчинд)
// STORAGE_DRIVER тохируулаагүй бол Vercel дээр db, бусад үед local.
// Файлыг зөвхөн эрх шалгасан /api/files/[id] маршрутаар үзүүлнэ.
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/auth";
import { IMAGE_MIME, MAX_UPLOAD_BYTES } from "@/lib/constants";

const ROOT = path.resolve(process.env.STORAGE_DIR || "./storage/uploads");
export const STORAGE_DRIVER: "db" | "local" =
  process.env.STORAGE_DRIVER === "db" || process.env.STORAGE_DRIVER === "local"
    ? process.env.STORAGE_DRIVER
    : process.env.VERCEL
      ? "db"
      : "local";

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

  let record;
  if (STORAGE_DRIVER === "db") {
    const id = crypto.randomUUID().replace(/-/g, "");
    record = await db.uploadedFile.create({
      data: { id, userId, fileName: file.name.slice(0, 200) || id, mimeType: mime, size: buf.length, path: `db:${id}`, purpose, data: new Uint8Array(buf) },
      select: { id: true, userId: true, fileName: true, mimeType: true, size: true, path: true, purpose: true, createdAt: true },
    });
  } else {
    const dir = path.join(ROOT, purpose.toLowerCase());
    await fs.mkdir(dir, { recursive: true });
    const name = `${crypto.randomUUID()}.${EXT[mime]}`;
    await fs.writeFile(path.join(dir, name), buf);
    record = await db.uploadedFile.create({
      data: { userId, fileName: file.name.slice(0, 200) || name, mimeType: mime, size: buf.length, path: path.posix.join(purpose.toLowerCase(), name), purpose },
      select: { id: true, userId: true, fileName: true, mimeType: true, size: true, path: true, purpose: true, createdAt: true },
    });
  }
  return { record, buffer: buf, mime: mime as "image/jpeg" | "image/png" | "image/webp" | "application/pdf" };
}

export async function readUpload(relPath: string): Promise<Buffer> {
  if (relPath.startsWith("db:")) {
    const row = await db.uploadedFile.findUnique({ where: { id: relPath.slice(3) }, select: { data: true } });
    if (!row?.data) throw new HttpError(404, "Файл олдсонгүй.");
    return Buffer.from(row.data);
  }
  const full = path.resolve(ROOT, relPath);
  if (!full.startsWith(ROOT)) throw new HttpError(400, "Буруу зам.");
  return fs.readFile(full);
}

export async function deleteUpload(relPath: string) {
  if (relPath.startsWith("db:")) return; // мөрийг устгахад агуулга хамт устна
  const full = path.resolve(ROOT, relPath);
  if (!full.startsWith(ROOT)) return;
  await fs.rm(full, { force: true });
}
