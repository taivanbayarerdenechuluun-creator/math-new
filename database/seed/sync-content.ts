/* eslint-disable no-console */
// Агуулгыг одоо байгаа өгөгдлийн санд ДАВХАРДУУЛАХГҮЙГЭЭР нэмнэ (idempotent):
// - сэдэв бүрт байхгүй хичээл (гарчгаар), томьёо (нэрээр)
// - бодлогын санд байхгүй бодлого (contentHash-аар)
// Хэрэглэгчийн өгөгдлийг устгах, өөрчлөхгүй. Ашиглах: npm run db:content
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import { CURRICULUM } from "./curriculum";
import { EXTRA_LESSONS } from "./lessons-extra";
import { QUESTIONS, type SeedQuestion } from "./questions";
import { EXTRA_QUESTIONS } from "./questions-extra";

const hash = (t: string) => crypto.createHash("sha1").update(t.toLowerCase().replace(/\s+/g, "").replace(/[$\\{}]/g, "")).digest("hex");

export async function syncContent(db: PrismaClient) {
  let lessons = 0;
  let formulas = 0;
  let questions = 0;
  const topics = await db.topic.findMany({ include: { lessons: { select: { title: true, order: true } }, formulas: { select: { title: true } } } });
  const bySlug = new Map(topics.map((t) => [t.slug, t]));

  const allLessons: Record<string, { title: string; summary: string; durationMin: number; content: string; examples: unknown[] }[]> = {};
  for (const g of CURRICULUM) for (const u of g.units) for (const t of u.topics) allLessons[t.slug] = [...(t.lessons ?? [])];
  for (const [slug, ls] of Object.entries(EXTRA_LESSONS)) allLessons[slug] = [...(allLessons[slug] ?? []), ...ls];

  for (const [slug, ls] of Object.entries(allLessons)) {
    const topic = bySlug.get(slug);
    if (!topic) continue;
    let order = topic.lessons.reduce((m, l) => Math.max(m, l.order + 1), 0);
    for (const l of ls) {
      if (topic.lessons.some((x) => x.title === l.title)) continue;
      await db.lesson.create({ data: { topicId: topic.id, title: l.title, summary: l.summary, content: l.content, examples: JSON.stringify(l.examples), durationMin: l.durationMin, order: order++ } });
      lessons++;
    }
  }
  for (const g of CURRICULUM)
    for (const u of g.units)
      for (const t of u.topics) {
        const topic = bySlug.get(t.slug);
        if (!topic) continue;
        for (const [title, latex] of t.formulas ?? []) {
          if (topic.formulas.some((f) => f.title === title)) continue;
          await db.formula.create({ data: { topicId: topic.id, title, latex } });
          formulas++;
        }
      }

  const admin = await db.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
  const author = await db.user.findFirst({ where: { role: "TEACHER" }, orderBy: { createdAt: "asc" } });
  const source = await db.questionSource.upsert({ where: { name: "IQ MATH жишээ сан" }, create: { name: "IQ MATH жишээ сан", type: "TEACHER" }, update: {} });
  const last = await db.question.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
  let n = last ? Number(last.code.replace(/\D/g, "")) + 1 : 1;

  const pool: SeedQuestion[] = [...QUESTIONS.filter((q) => (q.status ?? "PUBLISHED") === "PUBLISHED"), ...EXTRA_QUESTIONS];
  for (const q of pool) {
    const h = hash(q.text);
    if (await db.question.findFirst({ where: { contentHash: h }, select: { id: true } })) continue;
    const topic = bySlug.get(q.topic);
    const created = await db.question.create({
      data: {
        code: `IQM-${String(n++).padStart(6, "0")}`,
        gradeId: q.grade,
        topicId: topic?.id ?? null,
        type: q.type,
        difficulty: q.difficulty,
        text: q.text,
        correctAnswer: q.type === "MULTIPLE_CHOICE" ? q.answer : q.answer || null,
        tolerance: q.tolerance ?? null,
        explanation: q.explanation,
        status: "PUBLISHED",
        sourceId: source.id,
        authorId: author?.id ?? null,
        reviewerId: admin?.id ?? null,
        reviewedAt: new Date(),
        publishedAt: new Date(),
        contentHash: h,
        tags: q.topic.split("-").slice(1).join(","),
        options: { create: (q.options ?? []).map(([label, text], i) => ({ label, text, isCorrect: label === q.answer, order: i })) },
      },
    });
    if (admin) await db.questionReview.create({ data: { questionId: created.id, reviewerId: admin.id, action: "PUBLISH", comment: "Жишээ сан — хөдөлгүүрээр шалгаж нийтлэв" } });
    questions++;
  }
  return { lessons, formulas, questions };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("sync-content.ts")) {
  const db = new PrismaClient();
  syncContent(db)
    .then((r) => console.log(`✔ Нэмэгдсэн: ${r.lessons} хичээл, ${r.formulas} томьёо, ${r.questions} бодлого`))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}
