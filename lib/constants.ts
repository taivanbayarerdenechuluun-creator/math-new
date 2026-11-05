// Системийн бүх "enum" утгууд нэг дор — DB-д String хэлбэрээр хадгалагдана.

export const ROLES = ["STUDENT", "TEACHER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: "Сурагч",
  TEACHER: "Багш",
  ADMIN: "Админ",
};

export const GRADES = [6, 7, 8, 9, 10, 11, 12] as const;

export const QUESTION_TYPES = ["MULTIPLE_CHOICE", "NUMERIC", "EXPRESSION", "OPEN"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "Сонгох хариулттай",
  NUMERIC: "Тоон хариулттай",
  EXPRESSION: "Илэрхийлэл",
  OPEN: "Нээлттэй бодолт",
};

export const QUESTION_STATUSES = [
  "DRAFT",
  "PROCESSING",
  "NEEDS_REVIEW",
  "VERIFIED",
  "PUBLISHED",
  "REJECTED",
] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];
export const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  DRAFT: "Ноорог",
  PROCESSING: "Боловсруулж буй",
  NEEDS_REVIEW: "Хянах шаардлагатай",
  VERIFIED: "Баталгаажсан",
  PUBLISHED: "Нийтлэгдсэн",
  REJECTED: "Татгалзсан",
};

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Хялбар",
  2: "Дунд",
  3: "Ахисан",
  4: "Хүнд",
  5: "Олимпиад",
};

export const DOMAINS = [
  "ARITHMETIC",
  "ALGEBRA",
  "FUNCTIONS",
  "GEOMETRY",
  "TRIGONOMETRY",
  "STATISTICS",
  "ADVANCED",
] as const;
export type Domain = (typeof DOMAINS)[number];
export const DOMAIN_LABELS: Record<Domain, string> = {
  ARITHMETIC: "Тоо ба тоолол",
  ALGEBRA: "Алгебр",
  FUNCTIONS: "Функц ба график",
  GEOMETRY: "Геометр",
  TRIGONOMETRY: "Тригонометр",
  STATISTICS: "Магадлал ба статистик",
  ADVANCED: "Математик анализ",
};

export const EXPLAIN_MODES = ["BEGINNER", "STANDARD", "ADVANCED"] as const;
export type ExplainMode = (typeof EXPLAIN_MODES)[number];
export const EXPLAIN_MODE_LABELS: Record<ExplainMode, string> = {
  BEGINNER: "Анхан шат",
  STANDARD: "Стандарт",
  ADVANCED: "Гүнзгий",
};

export const XP_RULES = {
  PRACTICE_CORRECT: 10,
  PRACTICE_WRONG: 2,
  LESSON_COMPLETE: 25,
  SOLVER_USE: 3,
  EXAM_SUBMIT: 30,
  EXAM_PASS_BONUS: 50,
} as const;

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 10) * 1024 * 1024;
export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
