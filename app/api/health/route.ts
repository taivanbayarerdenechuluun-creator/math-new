// Тохиргооны төлөв — нууц утгыг хэзээ ч буцаахгүй, зөвхөн "тохируулсан эсэх"-ийг харуулна.
import { db } from "@/lib/db";
import { STORAGE_DRIVER } from "@/services/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL ?? "";
  const checks: Record<string, { ok: boolean; message: string }> = {
    database_url: url
      ? { ok: !(process.env.VERCEL && url.startsWith("file:")), message: url.startsWith("file:") ? "SQLite (Vercel дээр ажиллахгүй)" : "PostgreSQL" }
      : { ok: false, message: "DATABASE_URL тохируулаагүй" },
    auth_secret: { ok: (process.env.AUTH_SECRET?.length ?? 0) >= 32, message: process.env.AUTH_SECRET ? "тохируулсан" : "AUTH_SECRET тохируулаагүй" },
    storage: { ok: !(process.env.VERCEL && STORAGE_DRIVER === "local"), message: STORAGE_DRIVER },
    ai: { ok: true, message: process.env.ANTHROPIC_API_KEY ? "тохируулсан" : "тохируулаагүй (AI функц идэвхгүй)" },
    ocr: { ok: true, message: process.env.MATHPIX_APP_ID ? "Mathpix" : process.env.ANTHROPIC_API_KEY ? "Claude vision" : "тохируулаагүй" },
  };
  try {
    const [users, questions] = await Promise.all([db.user.count(), db.question.count({ where: { status: "PUBLISHED" } })]);
    checks.database = { ok: true, message: `холбогдсон · ${users} хэрэглэгч · ${questions} нийтлэгдсэн бодлого` };
    if (users === 0) checks.seed = { ok: false, message: "Сан хоосон — ADMIN_EMAIL/ADMIN_PASSWORD тохируулаад дахин deploy хийнэ үү" };
  } catch (e) {
    const code = (e as { code?: string }).code;
    checks.database = { ok: false, message: `холбогдож чадсангүй${code ? ` (${code})` : ""} — DATABASE_URL болон migration-ийг шалгана уу` };
  }
  const ok = Object.values(checks).every((c) => c.ok);
  return Response.json({ ok, checks }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
