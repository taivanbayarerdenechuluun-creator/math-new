import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, requireApiRole } from "@/lib/auth";
import { fail, rateLimit, route } from "@/lib/api";
import { aiTutorStream, describeAiError, isAiConfigured } from "@/services/ai/anthropic";
import { checkAchievements } from "@/features/gamification/server";
import type { ExplainMode } from "@/lib/constants";

export const maxDuration = 120;

const schema = z.object({ content: z.string().trim().min(1, "Мессеж хоосон байна.").max(4000, "Мессеж хэт урт байна.") });

/** Хэрэглэгчийн мессежийг хадгалаад AI-ийн хариуг текст урсгалаар (streaming) буцаана. */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireApiRole();
  const { id } = await params;
  const convo = await db.aiConversation.findUnique({ where: { id } });
  if (!convo || convo.userId !== user.id) throw new HttpError(404, "Яриа олдсонгүй.");
  if (!isAiConfigured()) return fail(503, "AI багш тохируулагдаагүй байна. Админ ANTHROPIC_API_KEY-г тохируулах шаардлагатай.");
  rateLimit(`tutor:${user.id}`, 60, 60 * 60_000);
  const { content } = schema.parse(await req.json());

  await db.aiMessage.create({ data: { conversationId: id, role: "user", content } });
  const history = await db.aiMessage.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" }, take: 40 });
  if (convo.title === "Шинэ яриа") {
    await db.aiConversation.update({ where: { id }, data: { title: content.replace(/\$/g, "").slice(0, 60) } });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        for await (const chunk of aiTutorStream(
          history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { mode: convo.mode as ExplainMode, grade: user.grade, guided: convo.guided },
        )) {
          full += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const { message } = describeAiError(err);
        const note = `\n\n⚠️ ${message}`;
        full += note;
        controller.enqueue(encoder.encode(note));
      } finally {
        // Таслагдсан ч гэсэн хүлээн авсан хэсгийг хадгална — сурагчийн ажил алга болохгүй
        if (full.trim()) await db.aiMessage.create({ data: { conversationId: id, role: "assistant", content: full } });
        await db.aiConversation.update({ where: { id }, data: { updatedAt: new Date() } });
        if (user.role === "STUDENT") await checkAchievements(user.id).catch(() => null);
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
});
