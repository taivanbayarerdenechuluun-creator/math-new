import { clearSessionCookie } from "@/lib/auth";
import { ok, route } from "@/lib/api";

export const POST = route(async () => {
  await clearSessionCookie();
  return ok({ redirect: "/" });
});
