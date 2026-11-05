import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * PostgreSQL дээр IQ MATH-ийг тусдаа schema-д байршуулах боломж (IQM_DB_SCHEMA, жишээ нь "iqmath").
 * Ижил санд өөр төслийн хүснэгтүүд байхад хоорондоо холилдохгүй. Vercel build үүнийг build-ийн үед тохируулна.
 */
export function withSchema(url: string | undefined, schema = process.env.IQM_DB_SCHEMA): string | undefined {
  if (!url || !schema || !/^postgres(ql)?:\/\//.test(url)) return url;
  const u = new URL(url);
  u.searchParams.set("schema", schema);
  return u.toString();
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: withSchema(process.env.DATABASE_URL),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** JSON string талбарыг аюулгүй задлах */
export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
