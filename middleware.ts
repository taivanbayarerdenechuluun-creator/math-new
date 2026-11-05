// Эхний шатны хамгаалалт: нэвтрээгүй хэрэглэгчийг /login руу, буруу орчинд орсныг өөрийн орчинд нь чиглүүлнэ.
// Энэ нь ЗӨВХӨН UX — жинхэнэ эрхийн шалгалт сервер компонент ба API route бүрт DB-ээр хийгдэнэ.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  const isStudentArea = pathname.startsWith("/student");
  const isStaffArea = pathname.startsWith("/admin");

  if ((isStudentArea || isStaffArea) && !session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (session && isStaffArea && session.role === "STUDENT") return NextResponse.redirect(new URL("/student", req.url));
  if (session && /^\/admin\/(users|analytics|audit)(\/|$)/.test(pathname) && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
  if (session && isStudentArea && session.role !== "STUDENT") return NextResponse.redirect(new URL("/admin", req.url));
  if (session && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL(session.role === "STUDENT" ? "/student" : "/admin", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/student/:path*", "/admin/:path*", "/login", "/register"] };
