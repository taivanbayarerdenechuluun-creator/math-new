// Жишээ бодлогын сан. Хариу бүрийг гараар бодож, давхар шалгасан.
// Эх сурвалж: "IQ MATH жишээ сан" (платформын баг зохиосон, албан ёсны шалгалтын даалгавар биш).

export interface SeedQuestion {
  key: string;
  grade: number;
  topic: string; // slug
  type: "MULTIPLE_CHOICE" | "NUMERIC" | "EXPRESSION" | "OPEN";
  difficulty: number;
  text: string;
  options?: [string, string][]; // [label, text]
  answer: string; // MC: үсэг
  tolerance?: number;
  explanation: string;
  steps?: [string, string, string][]; // [title, latex, explanation]
  status?: "PUBLISHED" | "NEEDS_REVIEW" | "DRAFT";
}

export const QUESTIONS: SeedQuestion[] = [
  // ───── 6-р анги ─────
  {
    key: "q1", grade: 6, topic: "g6-gcd-lcm", type: "MULTIPLE_CHOICE", difficulty: 2,
    text: "$84$ ба $126$ тоонуудын хамгийн их ерөнхий хуваагчийг ол.",
    options: [["A", "$14$"], ["B", "$21$"], ["C", "$42$"], ["D", "$84$"]], answer: "C",
    explanation: "$84 = 2^2\\cdot3\\cdot7$, $126 = 2\\cdot3^2\\cdot7$. Ерөнхий үржигдэхүүнүүдийг бага зэргээр нь авбал $2\\cdot3\\cdot7 = 42$.",
    steps: [
      ["Анхны үржигдэхүүнд задлах", "84 = 2^2\\cdot 3\\cdot 7,\\quad 126 = 2\\cdot 3^2\\cdot 7", "Хоёр тоог анхны тоонуудын үржвэрээр бичнэ."],
      ["Ерөнхий үржигдэхүүнийг сонгох", "\\text{ХИЕХ} = 2\\cdot 3\\cdot 7 = 42", "Хоёуланд байгаа анхны тоог бага зэргээр нь авна."],
    ],
  },
  {
    key: "q2", grade: 6, topic: "g6-gcd-lcm", type: "NUMERIC", difficulty: 1,
    text: "$12$ ба $18$ тоонуудын хамгийн бага ерөнхий хуваагдагчийг ол.", answer: "36",
    explanation: "$12 = 2^2\\cdot 3$, $18 = 2\\cdot 3^2$ ⇒ $\\text{ХБЕХ} = 2^2\\cdot3^2 = 36$.",
  },
  {
    key: "q3", grade: 6, topic: "g6-fractions", type: "NUMERIC", difficulty: 2,
    text: "Бод: $\\frac{2}{3} + \\frac{1}{4}$. Хариуг энгийн бутархайгаар бич (жишээ нь 5/6).", answer: "11/12",
    explanation: "Ерөнхий хуваарь 12: $\\frac{8}{12} + \\frac{3}{12} = \\frac{11}{12}$.",
    steps: [["Ерөнхий хуваарьт оруулах", "\\frac{2}{3} = \\frac{8}{12},\\ \\frac{1}{4} = \\frac{3}{12}", "ХБЕХ(3, 4) = 12."], ["Нэмэх", "\\frac{8+3}{12} = \\frac{11}{12}", "Хүртвэрүүдийг нэмнэ."]],
  },
  {
    key: "q4", grade: 6, topic: "g6-percent-ratio", type: "MULTIPLE_CHOICE", difficulty: 1,
    text: "$80$-ийн $25\\%$ хэд вэ?",
    options: [["A", "$15$"], ["B", "$20$"], ["C", "$25$"], ["D", "$32$"]], answer: "B",
    explanation: "$80 \\cdot \\frac{25}{100} = 20$.",
  },
  {
    key: "q5", grade: 6, topic: "g6-percent-ratio", type: "NUMERIC", difficulty: 2,
    text: "Пропорцоос $x$-ийг ол: $\\frac{3}{5} = \\frac{x}{20}$.", answer: "12",
    explanation: "Пропорцын үндсэн чанараар $5x = 60$, $x = 12$.",
  },
  {
    key: "q6", grade: 6, topic: "g6-area-perimeter", type: "NUMERIC", difficulty: 1,
    text: "Тэгш өнцөгтийн урт $8$ см, өргөн $5$ см. Талбайг нь (см²) ол.", answer: "40",
    explanation: "$S = a\\cdot b = 8 \\cdot 5 = 40$ см².",
  },
  {
    key: "q7", grade: 6, topic: "g6-divisibility", type: "MULTIPLE_CHOICE", difficulty: 1,
    text: "Аль нь анхны тоо вэ?",
    options: [["A", "$21$"], ["B", "$27$"], ["C", "$29$"], ["D", "$33$"]], answer: "C",
    explanation: "$21 = 3\\cdot7$, $27 = 3^3$, $33 = 3\\cdot 11$ зохиомол. $29$ нь зөвхөн $1$ ба өөртөө хуваагдана.",
  },
  {
    key: "q8", grade: 6, topic: "g6-fractions", type: "NUMERIC", difficulty: 1,
    text: "Бод: $2.5 \\cdot 0.4$", answer: "1",
    explanation: "$2.5 \\cdot 0.4 = 1$.",
  },
  // ───── 7-р анги ─────
  {
    key: "q9", grade: 7, topic: "g7-rational-numbers", type: "NUMERIC", difficulty: 1,
    text: "Бод: $-7 + 12 - (-3)$", answer: "8",
    explanation: "Сөрөг тоо хасах нь эерэг тоо нэмэхтэй адил: $-7 + 12 + 3 = 8$.",
  },
  {
    key: "q10", grade: 7, topic: "g7-linear-equations", type: "NUMERIC", difficulty: 1,
    text: "Тэгшитгэлийг бод: $3x - 7 = 11$", answer: "6",
    explanation: "$3x = 18$, $x = 6$.",
    steps: [["Сул гишүүнийг шилжүүлэх", "3x = 11 + 7 = 18", "−7-г тэмдгийг нь сольж баруун тал руу шилжүүлнэ."], ["3-т хуваах", "x = 6", "Хоёр талыг 3-т хуваана."]],
  },
  {
    key: "q11", grade: 7, topic: "g7-expressions", type: "EXPRESSION", difficulty: 2,
    text: "Илэрхийллийг хялбарчил: $3(x + 2) - 2(x - 1)$", answer: "x + 8",
    explanation: "$3x + 6 - 2x + 2 = x + 8$.",
  },
  {
    key: "q12", grade: 7, topic: "g7-triangles", type: "MULTIPLE_CHOICE", difficulty: 1,
    text: "Гурвалжны хоёр өнцөг $50^\\circ$ ба $60^\\circ$ бол гурав дахь өнцөг хэд вэ?",
    options: [["A", "$60^\\circ$"], ["B", "$70^\\circ$"], ["C", "$80^\\circ$"], ["D", "$90^\\circ$"]], answer: "B",
    explanation: "$180^\\circ - 50^\\circ - 60^\\circ = 70^\\circ$.",
  },
  {
    key: "q13", grade: 7, topic: "g7-statistics", type: "NUMERIC", difficulty: 1,
    text: "$4,\\ 7,\\ 9,\\ 10,\\ 15$ тоонуудын арифметик дунджийг ол.", answer: "9",
    explanation: "$\\frac{4+7+9+10+15}{5} = \\frac{45}{5} = 9$.",
  },
  {
    key: "q14", grade: 7, topic: "g7-coordinate-plane", type: "MULTIPLE_CHOICE", difficulty: 1,
    text: "$A(3;\\ -2)$ цэг координатын хавтгайн аль мөчид оршдог вэ?",
    options: [["A", "I мөч"], ["B", "II мөч"], ["C", "III мөч"], ["D", "IV мөч"]], answer: "D",
    explanation: "$x > 0$, $y < 0$ тул IV мөчид оршино.",
  },
  {
    key: "q15", grade: 7, topic: "g7-statistics", type: "NUMERIC", difficulty: 2,
    text: "$2,\\ 3,\\ 3,\\ 5,\\ 8,\\ 9$ өгөгдлийн медианыг ол.", answer: "4",
    explanation: "Тэгш тооны өгөгдөл тул дунд хоёр утгын дундаж: $\\frac{3 + 5}{2} = 4$.",
  },
  // ───── 8-р анги ─────
  {
    key: "q16", grade: 8, topic: "g8-exponents", type: "EXPRESSION", difficulty: 1,
    text: "Хялбарчил: $(2a^3)^2$", answer: "4a^6",
    explanation: "$(2a^3)^2 = 2^2 \\cdot a^{3\\cdot 2} = 4a^6$.",
  },
  {
    key: "q17", grade: 8, topic: "g8-factoring", type: "MULTIPLE_CHOICE", difficulty: 2,
    text: "$x^2 - 9$ илэрхийллийг үржигдэхүүнд задал.",
    options: [["A", "$(x - 9)(x + 1)$"], ["B", "$(x - 3)(x + 3)$"], ["C", "$(x - 3)^2$"], ["D", "$(x + 9)(x - 1)$"]], answer: "B",
    explanation: "Квадратын ялгаврын томьёо: $x^2 - 3^2 = (x - 3)(x + 3)$.",
  },
  {
    key: "q18", grade: 8, topic: "g8-linear-systems", type: "NUMERIC", difficulty: 2,
    text: "Системээс $x$-ийн утгыг ол: $\\begin{cases} 2x + y = 7 \\\\ x - y = -1 \\end{cases}$", answer: "2",
    explanation: "Хоёр тэгшитгэлийг нэмбэл $3x = 6$, $x = 2$ (мөн $y = 3$).",
    steps: [["Тэгшитгэлүүдийг нэмэх", "(2x + y) + (x - y) = 7 + (-1) \\Rightarrow 3x = 6", "y-ийн коэффициентууд эсрэг тэмдэгтэй тул нэмэхэд y устна."], ["x-ийг олох", "x = 2", "Хоёр талыг 3-т хуваав."]],
  },
  {
    key: "q19", grade: 8, topic: "g8-linear-function", type: "NUMERIC", difficulty: 1,
    text: "$y = 3x - 4$ функцийн $x = 5$ үеийн утгыг ол.", answer: "11",
    explanation: "$y = 3\\cdot5 - 4 = 11$.",
  },
  {
    key: "q20", grade: 8, topic: "g8-pythagoras", type: "NUMERIC", difficulty: 1,
    text: "Тэгш өнцөгт гурвалжны катетууд $6$ ба $8$ бол гипотенузыг ол.", answer: "10",
    explanation: "$c = \\sqrt{36 + 64} = \\sqrt{100} = 10$.",
  },
  {
    key: "q21", grade: 8, topic: "g8-probability", type: "MULTIPLE_CHOICE", difficulty: 1,
    text: "Шоо нэг удаа хаяхад тэгш тоо буух магадлал хэд вэ?",
    options: [["A", "$\\frac{1}{6}$"], ["B", "$\\frac{1}{3}$"], ["C", "$\\frac{1}{2}$"], ["D", "$\\frac{2}{3}$"]], answer: "C",
    explanation: "Тэгш тоо: 2, 4, 6 — 3 таатай үр дүн, нийт 6. $P = \\frac{3}{6} = \\frac{1}{2}$.",
  },
  {
    key: "q22", grade: 8, topic: "g8-linear-function", type: "MULTIPLE_CHOICE", difficulty: 1,
    text: "$y = -2x + 5$ шулууны налалт хэд вэ?",
    options: [["A", "$5$"], ["B", "$-2$"], ["C", "$2$"], ["D", "$-5$"]], answer: "B",
    explanation: "$y = kx + b$ хэлбэрт $k$ нь налалт: $k = -2$.",
  },
  // ───── 9-р анги ─────
  {
    key: "q23", grade: 9, topic: "g9-quadratic-equations", type: "NUMERIC", difficulty: 2,
    text: "Тэгшитгэлийг бод: $x^2 - 5x + 6 = 0$. Олон язгууртай бол цэг таслалаар тусгаарла (жишээ нь 1; 4).", answer: "2; 3",
    explanation: "$D = 25 - 24 = 1$, $x = \\frac{5 \\pm 1}{2}$ ⇒ $x_1 = 2$, $x_2 = 3$.",
  },
  {
    key: "q24", grade: 9, topic: "g9-quadratic-equations", type: "NUMERIC", difficulty: 2,
    text: "Тэгшитгэлийг бод: $x^2 - 6x + 9 = 0$", answer: "3",
    explanation: "$(x - 3)^2 = 0$ ⇒ $x = 3$ (давхар язгуур).",
  },
  {
    key: "q25", grade: 9, topic: "g9-square-roots", type: "MULTIPLE_CHOICE", difficulty: 2,
    text: "$\\sqrt{50}$-ийг хялбарчил.",
    options: [["A", "$5\\sqrt{2}$"], ["B", "$2\\sqrt{5}$"], ["C", "$25\\sqrt{2}$"], ["D", "$10\\sqrt{5}$"]], answer: "A",
    explanation: "$\\sqrt{50} = \\sqrt{25 \\cdot 2} = 5\\sqrt{2}$.",
  },
  {
    key: "q26", grade: 9, topic: "g9-quadratic-function", type: "NUMERIC", difficulty: 2,
    text: "$y = x^2 - 4x + 3$ параболын оройн абсцисс ($x$ координат)-ыг ол.", answer: "2",
    explanation: "$x_0 = -\\frac{b}{2a} = \\frac{4}{2} = 2$.",
  },
  {
    key: "q27", grade: 9, topic: "g9-inequalities", type: "MULTIPLE_CHOICE", difficulty: 1,
    text: "Тэнцэтгэл бишийг бод: $2x - 3 > 5$",
    options: [["A", "$x > 1$"], ["B", "$x > 4$"], ["C", "$x < 4$"], ["D", "$x > 8$"]], answer: "B",
    explanation: "$2x > 8$ ⇒ $x > 4$.",
  },
  {
    key: "q28", grade: 9, topic: "g9-right-trig", type: "NUMERIC", difficulty: 2,
    text: "Тэгш өнцөгт гурвалжны гипотенуз $10$, $\\alpha$ өнцгийн эсрэг катет $6$ бол $\\sin\\alpha$-г ол.", answer: "0.6",
    explanation: "$\\sin\\alpha = \\frac{6}{10} = 0.6$.",
  },
  {
    key: "q29", grade: 9, topic: "g9-circle", type: "NUMERIC", difficulty: 2,
    text: "Радиус нь $5$ см тойргийн уртыг ол. ($\\pi$ ашиглан бичих эсвэл 2 оронгийн нарийвчлалтай тоогоор)", answer: "10*pi", tolerance: 0.01,
    explanation: "$C = 2\\pi r = 10\\pi \\approx 31.42$ см.",
  },
  {
    key: "q30", grade: 9, topic: "g9-similarity", type: "MULTIPLE_CHOICE", difficulty: 2,
    text: "Хоёр төсөөтэй гурвалжны төсөөний коэффициент $3$ бол талбайнуудын харьцаа хэд вэ?",
    options: [["A", "$3$"], ["B", "$6$"], ["C", "$9$"], ["D", "$27$"]], answer: "C",
    explanation: "Төсөөтэй дүрсийн талбайн харьцаа нь коэффициентийн квадрат: $3^2 = 9$.",
  },
  // ───── 10-р анги ─────
  {
    key: "q31", grade: 10, topic: "g10-logarithms", type: "NUMERIC", difficulty: 1,
    text: "Бод: $\\log_2 32$", answer: "5",
    explanation: "$2^5 = 32$ тул $\\log_2 32 = 5$.",
  },
  {
    key: "q32", grade: 10, topic: "g10-exponential", type: "NUMERIC", difficulty: 2,
    text: "Тэгшитгэлийг бод: $2^{x+1} = 16$", answer: "3",
    explanation: "$2^{x+1} = 2^4$ ⇒ $x + 1 = 4$ ⇒ $x = 3$.",
  },
  {
    key: "q33", grade: 10, topic: "g10-functions", type: "NUMERIC", difficulty: 2,
    text: "$f(x) = 2x + 1$, $g(x) = x^2$ бол $f(g(3))$-ыг ол.", answer: "19",
    explanation: "$g(3) = 9$, $f(9) = 19$.",
  },
  {
    key: "q34", grade: 10, topic: "g10-unit-circle", type: "MULTIPLE_CHOICE", difficulty: 1,
    text: "$\\sin^2\\alpha + \\cos^2\\alpha$ хэдтэй тэнцүү вэ?",
    options: [["A", "$0$"], ["B", "$1$"], ["C", "$2$"], ["D", "$\\tan\\alpha$"]], answer: "B",
    explanation: "Тригонометрийн үндсэн адилтгал.",
  },
  {
    key: "q35", grade: 10, topic: "g10-combinatorics", type: "NUMERIC", difficulty: 2,
    text: "$5$ сурагчаас $2$ сурагчийг хэдэн янзаар сонгож болох вэ?", answer: "10",
    explanation: "$C_5^2 = \\frac{5!}{2!\\,3!} = 10$.",
  },
  {
    key: "q36", grade: 10, topic: "g10-functions", type: "MULTIPLE_CHOICE", difficulty: 2,
    text: "$f(x) = \\sqrt{x - 2}$ функцийн тодорхойлогдох муж аль нь вэ?",
    options: [["A", "$x > 2$"], ["B", "$x \\ge 2$"], ["C", "$x \\le 2$"], ["D", "Бүх бодит тоо"]], answer: "B",
    explanation: "Язгуур доорх илэрхийлэл сөрөг биш байх ёстой: $x - 2 \\ge 0$.",
  },
  {
    key: "q37", grade: 10, topic: "g10-unit-circle", type: "NUMERIC", difficulty: 1,
    text: "$\\cos 60^\\circ$-ийн утгыг ол.", answer: "1/2",
    explanation: "$\\cos 60^\\circ = \\frac{1}{2}$.",
  },
  // ───── 11-р анги ─────
  {
    key: "q38", grade: 11, topic: "g11-sequences", type: "NUMERIC", difficulty: 1,
    text: "Арифметик прогрессын $a_1 = 3$, $d = 4$ бол $a_{10}$-ыг ол.", answer: "39",
    explanation: "$a_{10} = 3 + 9\\cdot 4 = 39$.",
  },
  {
    key: "q39", grade: 11, topic: "g11-sequences", type: "NUMERIC", difficulty: 2,
    text: "Геометр прогрессын $b_1 = 2$, $q = 3$ бол эхний 4 гишүүний нийлбэрийг ол.", answer: "80",
    explanation: "$S_4 = \\frac{2(3^4 - 1)}{3 - 1} = 80$.",
  },
  {
    key: "q40", grade: 11, topic: "g11-statistics", type: "NUMERIC", difficulty: 3,
    text: "$2,\\ 4,\\ 4,\\ 4,\\ 5,\\ 5,\\ 7,\\ 9$ өгөгдлийн дисперсийг ($\\sigma^2 = \\frac{1}{n}\\sum (x_i - \\bar x)^2$) ол.", answer: "4",
    explanation: "$\\bar x = 5$. Хазайлтын квадратууд: $9,1,1,1,0,0,4,16$, нийлбэр $32$. $\\sigma^2 = 32/8 = 4$.",
  },
  {
    key: "q41", grade: 11, topic: "g11-trig-equations", type: "MULTIPLE_CHOICE", difficulty: 2,
    text: "$\\sin x = \\frac{1}{2}$, $x \\in \\left[0;\\ \\frac{\\pi}{2}\\right]$ бол $x$ хэд вэ?",
    options: [["A", "$\\frac{\\pi}{3}$"], ["B", "$\\frac{\\pi}{4}$"], ["C", "$\\frac{\\pi}{6}$"], ["D", "$\\frac{\\pi}{2}$"]], answer: "C",
    explanation: "$\\sin\\frac{\\pi}{6} = \\frac{1}{2}$.",
  },
  {
    key: "q42", grade: 11, topic: "g11-limits", type: "NUMERIC", difficulty: 2,
    text: "Хязгаарыг бод: $\\lim\\limits_{x \\to 2} \\frac{x^2 - 4}{x - 2}$", answer: "4",
    explanation: "$\\frac{(x-2)(x+2)}{x-2} = x + 2 \\to 4$.",
  },
  {
    key: "q43", grade: 11, topic: "g11-solids", type: "NUMERIC", difficulty: 2,
    text: "Цилиндрийн суурийн радиус $3$, өндөр $5$ бол эзлэхүүнийг ол. ($\\pi$ ашиглан эсвэл 1 оронгийн нарийвчлалтай)", answer: "45*pi", tolerance: 0.1,
    explanation: "$V = \\pi r^2 h = \\pi \\cdot 9 \\cdot 5 = 45\\pi \\approx 141.4$.",
  },
  // ───── 12-р анги ─────
  {
    key: "q44", grade: 12, topic: "g12-derivatives", type: "EXPRESSION", difficulty: 2,
    text: "$f(x) = x^3 - 2x^2 + 5$ функцийн уламжлалыг ол.", answer: "3x^2 - 4x",
    explanation: "$(x^3)' = 3x^2$, $(2x^2)' = 4x$, $(5)' = 0$.",
  },
  {
    key: "q45", grade: 12, topic: "g12-derivative-applications", type: "NUMERIC", difficulty: 3,
    text: "$f(x) = x^2 - 4x + 1$ функцийн хамгийн бага утгыг ол.", answer: "-3",
    explanation: "$f'(x) = 2x - 4 = 0$ ⇒ $x = 2$, $f(2) = 4 - 8 + 1 = -3$.",
  },
  {
    key: "q46", grade: 12, topic: "g12-integrals", type: "EXPRESSION", difficulty: 2,
    text: "$\\int 3x^2\\,dx$ интегралын эх функцийг ол (интегралын тогтмол $C$-г бичихгүй).", answer: "x^3",
    explanation: "$(x^3)' = 3x^2$ тул $\\int 3x^2\\,dx = x^3 + C$.",
  },
  {
    key: "q47", grade: 12, topic: "g12-integrals", type: "NUMERIC", difficulty: 3,
    text: "Тодорхой интегралыг бод: $\\int_0^2 (2x + 1)\\,dx$", answer: "6",
    explanation: "$\\left[x^2 + x\\right]_0^2 = 4 + 2 = 6$.",
  },
  {
    key: "q48", grade: 12, topic: "g12-derivatives", type: "MULTIPLE_CHOICE", difficulty: 1,
    text: "$(\\sin x)'$ хэдтэй тэнцүү вэ?",
    options: [["A", "$\\cos x$"], ["B", "$-\\cos x$"], ["C", "$-\\sin x$"], ["D", "$\\tan x$"]], answer: "A",
    explanation: "Синусын уламжлал нь косинус.",
  },
  {
    key: "q49", grade: 12, topic: "g12-derivatives", type: "NUMERIC", difficulty: 2,
    text: "$f(x) = e^x$ бол $f'(0)$-ийг ол.", answer: "1",
    explanation: "$(e^x)' = e^x$, $e^0 = 1$.",
  },
  {
    key: "q50", grade: 12, topic: "g12-derivative-applications", type: "OPEN", difficulty: 3,
    text: "$x > 0$ үед $x + \\frac{1}{x} \\ge 2$ болохыг батал.", answer: "",
    explanation: "$x + \\frac{1}{x} - 2 = \\frac{(x-1)^2}{x} \\ge 0$, учир нь хүртвэр сөрөг биш, хуваарь эерэг.",
  },
  // ───── Хянах шаардлагатай (OCR-оор оруулсан мэт) ─────
  {
    key: "r1", grade: 9, topic: "g9-quadratic-equations", type: "NUMERIC", difficulty: 2, status: "NEEDS_REVIEW",
    text: "Тэгшитгэлийг бод: $2x^2 + 3x - 2 = 0$", answer: "-2; 1/2",
    explanation: "$D = 25$, $x = \\frac{-3 \\pm 5}{4}$.",
  },
  {
    key: "r2", grade: 10, topic: "g10-logarithms", type: "NUMERIC", difficulty: 2, status: "NEEDS_REVIEW",
    text: "Бод: $\\log_3 18 - \\log_3 2$", answer: "2",
    explanation: "$\\log_3 9 = 2$.",
  },
  {
    key: "r3", grade: 8, topic: "g8-pythagoras", type: "MULTIPLE_CHOICE", difficulty: 1, status: "NEEDS_REVIEW",
    text: "Гипотенуз $13$, нэг катет $5$ бол нөгөө катет?",
    options: [["A", "$8$"], ["B", "$12$"], ["C", "$18$"], ["D", "$\\sqrt{194}$"]], answer: "B",
    explanation: "$\\sqrt{169 - 25} = 12$.",
  },
  {
    key: "d1", grade: 7, topic: "g7-linear-equations", type: "NUMERIC", difficulty: 2, status: "DRAFT",
    text: "Тэгшитгэлийг бод: $5x + 2 = 2x + 14$", answer: "4",
    explanation: "$3x = 12$, $x = 4$.",
  },
];

export const EXAMS = [
  {
    title: "6-р анги: Тоо, бутархай ба хувь",
    description: "Хуваагдах чанар, бутархай, хувь, пропорцын суурь шалгалт.",
    grade: 6, duration: 15, passing: 60,
    keys: ["q1", "q2", "q3", "q4", "q5", "q7", "q8"],
  },
  {
    title: "8-р анги: Алгебр ба геометрийн суурь",
    description: "Зэрэг, үржигдэхүүнд задлах, шугаман функц, систем, Пифагорын теорем.",
    grade: 8, duration: 15, passing: 60,
    keys: ["q16", "q17", "q18", "q19", "q20", "q21", "q22"],
  },
  {
    title: "9-р анги: Квадрат тэгшитгэл ба функц",
    description: "Квадрат тэгшитгэл, парабол, тэнцэтгэл биш, тригонометрийн үндэс.",
    grade: 9, duration: 20, passing: 60,
    keys: ["q23", "q24", "q25", "q26", "q27", "q28", "q29", "q30"],
  },
  {
    title: "12-р анги: Математик анализын бэлтгэл",
    description: "Уламжлал, түүний хэрэглээ, интеграл. (Дадлагын шалгалт — албан ёсны ЭЕШ-ийн даалгавар биш.)",
    grade: 12, duration: 25, passing: 60,
    keys: ["q44", "q45", "q46", "q47", "q48", "q49"],
  },
];
