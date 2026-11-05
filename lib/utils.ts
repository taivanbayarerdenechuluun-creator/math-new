import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Өөрийн өнгөний токенуудыг (text-navy, bg-primary …) зөрчилтэй гэж таньдаг болгох
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "text-color": [{ text: ["fg", "muted", "subtle", "primary", "accent", "navy", "success", "warning", "danger", "info", "white", "bg"] }],
      "bg-color": [{ bg: ["bg", "surface", "surface-2", "surface-3", "primary", "primary-hover", "primary-soft", "accent", "accent-soft", "navy", "success", "success-soft", "warning", "warning-soft", "danger", "danger-soft", "info", "info-soft", "fg", "white"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Улаанбаатарын цагийн бүсээр YYYY-MM-DD */
export function dayKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(d);
}

export function addDays(key: string, delta: number): string {
  const d = new Date(key + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// Огноог тогтмол хэлбэрээр (2026.11.05 14:30, Улаанбаатарын цаг) форматлана.
// "mn-MN" locale-ийн гаралт Node ба хөтчийн ICU хооронд ялгаатай тул hydration алдаа гаргадаг байсан.
const UB_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ulaanbaatar",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function ubParts(d: Date | string) {
  const p = Object.fromEntries(UB_PARTS.formatToParts(new Date(d)).map((x) => [x.type, x.value]));
  return p as Record<"year" | "month" | "day" | "hour" | "minute", string>;
}

export function formatDate(d: Date | string) {
  const p = ubParts(d);
  return `${p.year}.${p.month}.${p.day}`;
}

export function formatDateTime(d: Date | string) {
  const p = ubParts(d);
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}

export function pct(n: number, d: number) {
  return d === 0 ? 0 : Math.round((n / d) * 100);
}

/** XP → түвшин. Түвшин бүрт шаардлагатай XP аажмаар өснө. */
export function levelFromXp(xp: number) {
  let level = 1;
  let need = 100;
  let rest = xp;
  while (rest >= need) {
    rest -= need;
    level++;
    need = Math.round(need * 1.25);
  }
  return { level, current: rest, needed: need, progress: Math.round((rest / need) * 100) };
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9а-яөүё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function weekdayShort(key: string) {
  const names = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];
  return names[new Date(key + "T12:00:00Z").getUTCDay()];
}
