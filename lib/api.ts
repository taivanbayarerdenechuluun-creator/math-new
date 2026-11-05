// API route-уудын нийтлэг туслах функцүүд: алдааны нэгдсэн боловсруулалт, rate limit, audit.
import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth";
import { db } from "./db";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Алдааг аюулгүй, монгол хэл дээрх мессеж болгон хувиргана. Дотоод алдааг гадагш задруулахгүй. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.status, err.message);
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
        return fail(400, details[0]?.message || "Оруулсан мэдээлэл буруу байна.", details);
      }
      console.error("[api]", err);
      return fail(500, "Серверийн алдаа гарлаа. Дахин оролдоно уу.");
    }
  };
}

// ── Энгийн in-memory rate limiter (нэг instance). Олон instance дээр Redis/Upstash ашиглана. ──
const buckets = new Map<string, { count: number; reset: number }>();

// Тестийн орчинд хязгаарыг өсгөх боломжтой (жишээ нь RATE_LIMIT_MULTIPLIER=100). Production-д тохируулахгүй.
const MULTIPLIER = Math.max(1, Number(process.env.RATE_LIMIT_MULTIPLIER ?? 1) || 1);

export function rateLimit(key: string, baseLimit: number, windowMs: number) {
  const limit = baseLimit * MULTIPLIER;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  b.count++;
  if (b.count > limit) {
    const sec = Math.ceil((b.reset - now) / 1000);
    throw new HttpError(429, `Хэт олон хүсэлт илгээлээ. ${sec} секундын дараа дахин оролдоно уу.`);
  }
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export async function audit(userId: string | null, action: string, entity: string, entityId?: string, details?: unknown) {
  try {
    await db.auditLog.create({
      data: { userId, action, entity, entityId, details: details ? JSON.stringify(details).slice(0, 4000) : null },
    });
  } catch (e) {
    console.error("[audit]", e);
  }
}
