// Сервер талын нэвтрэлт ба эрхийн шалгалт. Frontend-ийн шалгалтад хэзээ ч найдахгүй —
// API route, server component бүр энд байгаа функцээр хэрэглэгчийг DB-ээс дахин шалгана.
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { SESSION_COOKIE, SESSION_TTL_SEC, signSession, verifySession } from "./session";
import type { Role } from "./constants";

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 11);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSessionCookie(user: { id: string; role: string; name: string }) {
  const token = await signSession({ sub: user.id, role: user.role as Role, name: user.name });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Одоогийн хэрэглэгч (DB-ээс шинэчилсэн). Идэвхгүй бол null. */
export async function getCurrentUser() {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      grade: true,
      xp: true,
      streak: true,
      longestStreak: true,
      dailyGoal: true,
      explainMode: true,
      avatarColor: true,
      isActive: true,
      showOnLeaderboard: true,
      lastActiveDate: true,
      createdAt: true,
    },
  });
  if (!user || !user.isActive) return null;
  return { ...user, role: user.role as Role };
}
export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Server component-д: эрхгүй бол чиглүүлнэ */
export async function requirePageRole(roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect(user.role === "STUDENT" ? "/student" : "/admin");
  return user;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** API route-д: эрхгүй бол HttpError шиднэ */
export async function requireApiRole(roles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Нэвтрэх шаардлагатай.");
  if (roles && !roles.includes(user.role)) throw new HttpError(403, "Танд энэ үйлдлийг хийх эрх байхгүй.");
  return user;
}

export const STAFF: Role[] = ["TEACHER", "ADMIN"];

/** Багш зөвхөн өөрт хуваарилагдсан ангийн контентыг засна. Админ бүгдийг. */
export async function canManageGrade(user: CurrentUser, gradeId: number): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (user.role !== "TEACHER") return false;
  const assignments = await db.teacherTopicAssignment.findMany({ where: { userId: user.id } });
  // Хуваарилалт огт хийгдээгүй багш бүх ангид ажиллах эрхтэй (жижиг сургуулийн тохиргоо)
  if (assignments.length === 0) return true;
  return assignments.some((a) => a.gradeId === gradeId);
}
