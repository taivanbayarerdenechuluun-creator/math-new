// Хөтөлбөрийн CRUD: бүлэг → сэдэв → хичээл / томьёо / урьдчилсан нөхцөл.
import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, canManageGrade, type CurrentUser } from "@/lib/auth";
import { audit } from "@/lib/api";
import { DOMAINS } from "@/lib/constants";
import { slugify } from "@/lib/utils";

const unitSchema = z.object({
  gradeId: z.coerce.number().int().min(6).max(12),
  title: z.string().trim().min(2).max(120),
  description: z.string().max(500).nullable().optional(),
  domain: z.enum(DOMAINS),
  order: z.coerce.number().int().default(0),
  isOfficial: z.boolean().optional(),
  isEnrichment: z.boolean().optional(),
  verificationNote: z.string().max(500).nullable().optional(),
});
const topicSchema = z.object({
  unitId: z.string(),
  title: z.string().trim().min(2).max(120),
  description: z.string().max(1000).nullable().optional(),
  order: z.coerce.number().int().default(0),
});
const lessonSchema = z.object({
  topicId: z.string(),
  title: z.string().trim().min(2).max(160),
  summary: z.string().max(400).nullable().optional(),
  content: z.string().min(1, "Агуулга хоосон байна").max(50000),
  examples: z.array(z.object({ problem: z.string().max(2000), solution: z.string().max(4000) })).max(20).default([]),
  order: z.coerce.number().int().default(0),
  durationMin: z.coerce.number().int().min(1).max(240).default(15),
  isPublished: z.boolean().default(true),
  isEnrichment: z.boolean().default(false),
});
const formulaSchema = z.object({ topicId: z.string(), title: z.string().trim().min(1).max(120), latex: z.string().min(1).max(1000), description: z.string().max(500).nullable().optional() });
const prereqSchema = z.object({ topicId: z.string(), prerequisiteId: z.string() });

export type Entity = "units" | "topics" | "lessons" | "formulas" | "prerequisites";

async function gradeOf(entity: Entity, idOrParent: { unitId?: string; topicId?: string; gradeId?: number }) {
  if (idOrParent.gradeId) return idOrParent.gradeId;
  if (idOrParent.unitId) return (await db.curriculumUnit.findUniqueOrThrow({ where: { id: idOrParent.unitId } })).gradeId;
  if (idOrParent.topicId) return (await db.topic.findUniqueOrThrow({ where: { id: idOrParent.topicId }, include: { unit: true } })).unit.gradeId;
  throw new HttpError(400, `Буруу ${entity}`);
}

async function guard(user: CurrentUser, grade: number) {
  if (!(await canManageGrade(user, grade))) throw new HttpError(403, "Танд энэ ангийн хөтөлбөрийг засах эрх байхгүй.");
}

async function uniqueSlug(base: string) {
  let slug = slugify(base) || "topic";
  for (let i = 2; await db.topic.findUnique({ where: { slug } }); i++) slug = `${slugify(base)}-${i}`;
  return slug;
}

export async function createEntity(entity: Entity, body: unknown, user: CurrentUser) {
  switch (entity) {
    case "units": {
      const d = unitSchema.parse(body);
      await guard(user, d.gradeId);
      if (d.isOfficial && user.role !== "ADMIN") throw new HttpError(403, "Албан ёсны хөтөлбөр гэж зөвхөн админ тэмдэглэнэ.");
      const r = await db.curriculumUnit.create({ data: { ...d, isOfficial: d.isOfficial ?? false, isEnrichment: d.isEnrichment ?? false } });
      await audit(user.id, "CREATE", "curriculum_unit", r.id);
      return r;
    }
    case "topics": {
      const d = topicSchema.parse(body);
      await guard(user, await gradeOf(entity, d));
      const r = await db.topic.create({ data: { ...d, slug: await uniqueSlug(d.title) } });
      await audit(user.id, "CREATE", "topic", r.id);
      return r;
    }
    case "lessons": {
      const d = lessonSchema.parse(body);
      await guard(user, await gradeOf(entity, d));
      const r = await db.lesson.create({ data: { ...d, examples: JSON.stringify(d.examples) } });
      await audit(user.id, "CREATE", "lesson", r.id);
      return r;
    }
    case "formulas": {
      const d = formulaSchema.parse(body);
      await guard(user, await gradeOf(entity, d));
      return db.formula.create({ data: d });
    }
    case "prerequisites": {
      const d = prereqSchema.parse(body);
      if (d.topicId === d.prerequisiteId) throw new HttpError(400, "Сэдэв өөрийгөө урьдчилсан нөхцөл болгож болохгүй.");
      await guard(user, await gradeOf(entity, { topicId: d.topicId }));
      // Тойрог хамаарал үүсэхээс сэргийлэх
      const reverse = await db.topicPrerequisite.findFirst({ where: { topicId: d.prerequisiteId, prerequisiteId: d.topicId } });
      if (reverse) throw new HttpError(400, "Харилцан хамааралтай урьдчилсан нөхцөл үүсгэх боломжгүй.");
      return db.topicPrerequisite.upsert({ where: { topicId_prerequisiteId: d }, create: d, update: {} });
    }
  }
}

export async function updateEntity(entity: Entity, id: string, body: unknown, user: CurrentUser) {
  switch (entity) {
    case "units": {
      const cur = await db.curriculumUnit.findUniqueOrThrow({ where: { id } });
      const d = unitSchema.partial().parse(body);
      await guard(user, cur.gradeId);
      if (d.gradeId) await guard(user, d.gradeId);
      if (d.isOfficial !== undefined && d.isOfficial !== cur.isOfficial && user.role !== "ADMIN") throw new HttpError(403, "Албан ёсны төлөвийг зөвхөн админ өөрчилнө.");
      const r = await db.curriculumUnit.update({ where: { id }, data: d });
      await audit(user.id, "UPDATE", "curriculum_unit", id, d.isOfficial !== undefined ? { isOfficial: d.isOfficial } : undefined);
      return r;
    }
    case "topics": {
      const d = topicSchema.partial().parse(body);
      await guard(user, await gradeOf(entity, { topicId: id }));
      return db.topic.update({ where: { id }, data: d });
    }
    case "lessons": {
      const cur = await db.lesson.findUniqueOrThrow({ where: { id } });
      const d = lessonSchema.partial().parse(body);
      await guard(user, await gradeOf(entity, { topicId: cur.topicId }));
      const r = await db.lesson.update({ where: { id }, data: { ...d, examples: d.examples ? JSON.stringify(d.examples) : undefined } });
      await audit(user.id, "UPDATE", "lesson", id);
      return r;
    }
    case "formulas": {
      const cur = await db.formula.findUniqueOrThrow({ where: { id } });
      await guard(user, await gradeOf(entity, { topicId: cur.topicId }));
      return db.formula.update({ where: { id }, data: formulaSchema.partial().parse(body) });
    }
    default:
      throw new HttpError(400, "Энэ төрлийг засах боломжгүй.");
  }
}

export async function deleteEntity(entity: Entity, id: string, user: CurrentUser) {
  switch (entity) {
    case "units": {
      const cur = await db.curriculumUnit.findUniqueOrThrow({ where: { id }, include: { topics: { include: { _count: { select: { questions: true } } } } } });
      await guard(user, cur.gradeId);
      if (cur.topics.some((t) => t._count.questions > 0)) throw new HttpError(400, "Бодлого холбогдсон сэдэвтэй бүлгийг устгах боломжгүй. Эхлээд бодлогуудыг шилжүүлнэ үү.");
      await db.curriculumUnit.delete({ where: { id } });
      break;
    }
    case "topics": {
      const cur = await db.topic.findUniqueOrThrow({ where: { id }, include: { unit: true, _count: { select: { questions: true } } } });
      await guard(user, cur.unit.gradeId);
      if (cur._count.questions > 0) throw new HttpError(400, "Бодлого холбогдсон сэдвийг устгах боломжгүй.");
      await db.topic.delete({ where: { id } });
      break;
    }
    case "lessons": {
      const cur = await db.lesson.findUniqueOrThrow({ where: { id } });
      await guard(user, await gradeOf(entity, { topicId: cur.topicId }));
      await db.lesson.delete({ where: { id } });
      break;
    }
    case "formulas": {
      const cur = await db.formula.findUniqueOrThrow({ where: { id } });
      await guard(user, await gradeOf(entity, { topicId: cur.topicId }));
      await db.formula.delete({ where: { id } });
      break;
    }
    case "prerequisites": {
      const cur = await db.topicPrerequisite.findUniqueOrThrow({ where: { id } });
      await guard(user, await gradeOf(entity, { topicId: cur.topicId }));
      await db.topicPrerequisite.delete({ where: { id } });
      break;
    }
  }
  await audit(user.id, "DELETE", entity, id);
}
