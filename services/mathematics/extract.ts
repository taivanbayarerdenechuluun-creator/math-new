// "Тэгшитгэлийг бод: $...$" гэх мэт зөвхөн заавар үгтэй бол математик хэсгийг салгаж symbolic-оор бодно.
const INSTRUCTION_WORDS =
  /(тэгшитгэлийн системийг|тэгшитгэлийг|тэгшитгэл|тэнцэтгэл бишийг|тэнцэтгэл биш|системийг|систем|илэрхийллийг|илэрхийлэл|хялбарчил(на уу)?|утгыг|үржигдэхүүнд задал(на уу)?|уламжлалыг|уламжлал|бод(но уу)?|ол(но уу)?|тооцоол(но уу)?|функцийн|дараах|өгөгдсөн)/gi;

export function extractPureMath(input: string): string | null {
  const segs = [...input.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g)].map((m) => (m[1] ?? m[2]).trim());
  if (segs.length === 0) return null;
  const residue = input
    .replace(/\$\$[\s\S]+?\$\$|\$[^$]+?\$/g, " ")
    .replace(INSTRUCTION_WORDS, " ")
    .replace(/[\s.,:;!?()\-–]+/g, "");
  if (residue.length > 0) return null;
  // зөвхөн тоо биш, үйлдэл/тэнцүүгийн тэмдэг агуулсан байх ёстой
  if (!segs.some((s) => /[=<>+\-*/^]|\\(frac|sqrt|log|sin|cos|tan|le|ge|cdot|begin)/.test(s))) return null;
  return segs.join("; ");
}

