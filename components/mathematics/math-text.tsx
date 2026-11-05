// Markdown-ийн хялбаршуулсан хэлбэр + KaTeX. Сервер болон клиент аль алинд ажиллана.
// Аюулгүй байдал: бүх энгийн текстийг HTML escape хийнэ, KaTeX-ийг trust:false горимоор ажиллуулна.
import katex from "katex";
import { cn } from "@/lib/utils";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderTex(tex: string, display = false): string {
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, trust: false, strict: "ignore", output: "html" });
  } catch {
    return `<code>${esc(tex)}</code>`;
  }
}

/** Мөр доторх: $...$ математик, **тод**, `код` */
function renderInline(text: string): string {
  const out: string[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$|\\\((.+?)\\\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(formatText(text.slice(last, m.index)));
    if (m[1] !== undefined) out.push(renderTex(m[1], true));
    else out.push(renderTex(m[2] ?? m[3], false));
    last = m.index + m[0].length;
  }
  out.push(formatText(text.slice(last)));
  return out.join("");
}

function formatText(s: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-surface-2 px-1 py-0.5 text-[0.9em]">$1</code>');
}

export function renderMarkdownMath(src: string): string {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }
    // $$ ... $$ олон мөрт блок
    if (trimmed.startsWith("$$") && !(trimmed.length > 4 && trimmed.endsWith("$$"))) {
      const buf = [trimmed.slice(2)];
      i++;
      while (i < lines.length && !lines[i].includes("$$")) buf.push(lines[i++]);
      if (i < lines.length) buf.push(lines[i++].replace("$$", ""));
      html.push(renderTex(buf.join("\n"), true));
      continue;
    }
    if (/^#{2,3}\s/.test(trimmed)) {
      const level = trimmed.startsWith("###") ? 3 : 2;
      html.push(`<h${level}>${renderInline(trimmed.replace(/^#+\s/, ""))}</h${level}>`);
      i++;
      continue;
    }
    if (/^[-*]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) items.push(`<li>${renderInline(lines[i++].trim().replace(/^[-*]\s/, ""))}</li>`);
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\d+[.)]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s/.test(lines[i])) items.push(`<li>${renderInline(lines[i++].trim().replace(/^\d+[.)]\s/, ""))}</li>`);
      html.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    if (trimmed.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      html.push(
        `<div class="overflow-x-auto"><table><thead><tr>${head.map((c) => `<th>${renderInline(c)}</th>`).join("")}</tr></thead><tbody>${body
          .map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`,
      );
      continue;
    }
    // Догол мөр: дараагийн хоосон мөр хүртэл
    const buf = [trimmed];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|[-*]\s|\d+[.)]\s|\||\$\$)/.test(lines[i].trim())) buf.push(lines[i++].trim());
    const para = buf.join(" ");
    // Ганц $$...$$ мөр
    if (/^\$\$[\s\S]+\$\$$/.test(para)) html.push(renderTex(para.slice(2, -2), true));
    else html.push(`<p>${renderInline(para)}</p>`);
  }
  return html.join("");
}

export function MathText({ text, className, inline = false }: { text: string; className?: string; inline?: boolean }) {
  if (inline) return <span className={className} dangerouslySetInnerHTML={{ __html: renderInline(text) }} />;
  return <div className={cn("math-prose", className)} dangerouslySetInnerHTML={{ __html: renderMarkdownMath(text) }} />;
}

export function Tex({ tex, display = false, className }: { tex: string; display?: boolean; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: renderTex(tex, display) }} />;
}
