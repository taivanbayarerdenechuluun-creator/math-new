// Бодлогын сангийн өргөтгөл. Хариу бүрийг гараар бодож, tests/seed-data.test.ts-ээр хөдөлгүүрээр шалгана.
import type { SeedQuestion } from "./questions";

export const EXTRA_QUESTIONS: SeedQuestion[] = [
  // 6-р анги
  { key: "x1", grade: 6, topic: "g6-area-perimeter", type: "NUMERIC", difficulty: 1, text: "Квадратын периметр $36$ см бол талбайг (см²) ол.", answer: "81", explanation: "$a = 9$ см, $S = 81$ см²." },
  { key: "x2", grade: 6, topic: "g6-area-perimeter", type: "NUMERIC", difficulty: 2, text: "Суурь нь $10$ см, өндөр нь $6$ см гурвалжны талбайг (см²) ол.", answer: "30", explanation: "$S = \\frac{1}{2}\\cdot 10\\cdot 6 = 30$." },
  { key: "x3", grade: 6, topic: "g6-fractions", type: "NUMERIC", difficulty: 2, text: "Бод: $\\frac{5}{6} - \\frac{3}{8}$. Хариуг энгийн бутархайгаар бич.", answer: "11/24", explanation: "$\\frac{20}{24} - \\frac{9}{24} = \\frac{11}{24}$." },
  { key: "x4", grade: 6, topic: "g6-percent-ratio", type: "NUMERIC", difficulty: 2, text: "$15\\,000$₮-ийн бараа $20\\%$ хямдарвал хэдэн төгрөг болох вэ?", answer: "12000", explanation: "$15\\,000 \\cdot 0.8 = 12\\,000$." },
  { key: "x5", grade: 6, topic: "g6-divisibility", type: "MULTIPLE_CHOICE", difficulty: 1, text: "Аль тоо $9$-д хуваагдах вэ?", options: [["A", "$2\\,341$"], ["B", "$5\\,103$"], ["C", "$7\\,120$"], ["D", "$4\\,444$"]], answer: "B", explanation: "$5 + 1 + 0 + 3 = 9$ тул $9$-д хуваагдана." },
  // 7-р анги
  { key: "x6", grade: 7, topic: "g7-linear-equations", type: "NUMERIC", difficulty: 2, text: "Тэгшитгэлийг бод: $2(x - 3) = x + 4$", answer: "10", explanation: "$2x - 6 = x + 4 \\Rightarrow x = 10$." },
  { key: "x7", grade: 7, topic: "g7-linear-equations", type: "NUMERIC", difficulty: 2, text: "Тэгшитгэлийг бод: $\\frac{x}{3} + 1 = 5$", answer: "12", explanation: "$\\frac{x}{3} = 4 \\Rightarrow x = 12$." },
  { key: "x8", grade: 7, topic: "g7-expressions", type: "EXPRESSION", difficulty: 1, text: "Хялбарчил: $5a - 2(a + 4)$", answer: "3a - 8", explanation: "$5a - 2a - 8 = 3a - 8$." },
  { key: "x9", grade: 7, topic: "g7-triangles", type: "NUMERIC", difficulty: 2, text: "Адил хажуут гурвалжны оройн өнцөг $40^\\circ$ бол суурийн өнцгийг (градусаар) ол.", answer: "70", explanation: "$(180^\\circ - 40^\\circ) : 2 = 70^\\circ$." },
  { key: "x10", grade: 7, topic: "g7-coordinate-plane", type: "MULTIPLE_CHOICE", difficulty: 1, text: "$A(1;\\ 3)$ ба $B(5;\\ 7)$ цэгүүдийг холбосон хэрчмийн дунд цэг аль нь вэ?", options: [["A", "$(2;\\ 4)$"], ["B", "$(3;\\ 5)$"], ["C", "$(4;\\ 4)$"], ["D", "$(6;\\ 10)$"]], answer: "B", explanation: "$\\left(\\frac{1+5}{2};\\ \\frac{3+7}{2}\\right) = (3;\\ 5)$." },
  { key: "x11", grade: 7, topic: "g7-statistics", type: "NUMERIC", difficulty: 1, text: "$3, 7, 7, 2, 9, 7, 5$ өгөгдлийн моодыг ол.", answer: "7", explanation: "$7$ гурван удаа давтагдсан." },
  // 8-р анги
  { key: "x12", grade: 8, topic: "g8-exponents", type: "NUMERIC", difficulty: 1, text: "Бод: $3^{-2}$. Энгийн бутархайгаар бич.", answer: "1/9", explanation: "$3^{-2} = \\frac{1}{9}$." },
  { key: "x13", grade: 8, topic: "g8-exponents", type: "EXPRESSION", difficulty: 2, text: "Хялбарчил: $\\frac{x^7 \\cdot x^2}{x^5}$", answer: "x^4", explanation: "$x^{7+2-5} = x^4$." },
  { key: "x14", grade: 8, topic: "g8-factoring", type: "MULTIPLE_CHOICE", difficulty: 2, text: "$x^2 + 10x + 25$-ыг үржигдэхүүнд задал.", options: [["A", "$(x + 5)^2$"], ["B", "$(x - 5)^2$"], ["C", "$(x + 25)(x + 1)$"], ["D", "$(x + 5)(x - 5)$"]], answer: "A", explanation: "Нийлбэрийн квадрат: $x^2 + 2\\cdot 5x + 5^2$." },
  { key: "x15", grade: 8, topic: "g8-linear-systems", type: "NUMERIC", difficulty: 2, text: "Системээс $y$-ийн утгыг ол: $\\begin{cases} x + y = 10 \\\\ x - y = 4 \\end{cases}$", answer: "3", explanation: "$x = 7$, $y = 3$." },
  { key: "x16", grade: 8, topic: "g8-pythagoras", type: "NUMERIC", difficulty: 2, text: "Тэгш өнцөгтийн талууд $5$ ба $12$ бол диагоналийн уртыг ол.", answer: "13", explanation: "$\\sqrt{25 + 144} = 13$." },
  { key: "x17", grade: 8, topic: "g8-probability", type: "NUMERIC", difficulty: 2, text: "Уутанд $3$ улаан, $5$ цэнхэр бөмбөг бий. Санамсаргүй нэгийг авахад улаан байх магадлалыг энгийн бутархайгаар ол.", answer: "3/8", explanation: "$P = \\frac{3}{8}$." },
  { key: "x18", grade: 8, topic: "g8-linear-function", type: "NUMERIC", difficulty: 2, text: "$(1;\\ 3)$ ба $(3;\\ 7)$ цэгүүдийг дайрсан шулууны налалтыг ол.", answer: "2", explanation: "$k = \\frac{7 - 3}{3 - 1} = 2$." },
  // 9-р анги
  { key: "x19", grade: 9, topic: "g9-square-roots", type: "MULTIPLE_CHOICE", difficulty: 2, text: "$\\sqrt{12} + \\sqrt{27}$ хэдтэй тэнцүү вэ?", options: [["A", "$\\sqrt{39}$"], ["B", "$5\\sqrt{3}$"], ["C", "$6\\sqrt{3}$"], ["D", "$13$"]], answer: "B", explanation: "$2\\sqrt{3} + 3\\sqrt{3} = 5\\sqrt{3}$." },
  { key: "x20", grade: 9, topic: "g9-quadratic-equations", type: "NUMERIC", difficulty: 3, text: "Тэгшитгэлийг бод: $2x^2 + 3x - 2 = 0$. Язгууруудыг цэг таслалаар тусгаарла.", answer: "-2; 1/2", explanation: "$D = 25$, $x = \\frac{-3 \\pm 5}{4}$." },
  { key: "x21", grade: 9, topic: "g9-quadratic-equations", type: "NUMERIC", difficulty: 3, text: "$x^2 - 7x + 12 = 0$ тэгшитгэлийн язгууруудын үржвэрийг ол.", answer: "12", explanation: "Виетийн теоремоор $x_1 x_2 = \\frac{c}{a} = 12$." },
  { key: "x22", grade: 9, topic: "g9-quadratic-function", type: "NUMERIC", difficulty: 3, text: "$y = -x^2 + 2x + 3$ функцийн хамгийн их утгыг ол.", answer: "4", explanation: "$x_0 = 1$, $y_0 = -1 + 2 + 3 = 4$." },
  { key: "x23", grade: 9, topic: "g9-inequalities", type: "MULTIPLE_CHOICE", difficulty: 3, text: "$x^2 - 4 \\le 0$ тэнцэтгэл бишийн шийд аль нь вэ?", options: [["A", "$[-2;\\ 2]$"], ["B", "$(-2;\\ 2)$"], ["C", "$(-\\infty;\\ -2] \\cup [2;\\ +\\infty)$"], ["D", "$[0;\\ 2]$"]], answer: "A", explanation: "Язгуур $\\pm 2$, параболын салаа дээш тул хооронд нь сөрөг." },
  { key: "x24", grade: 9, topic: "g9-inequalities", type: "MULTIPLE_CHOICE", difficulty: 2, text: "$-3x + 6 > 0$ тэнцэтгэл бишийн шийд аль нь вэ?", options: [["A", "$x > 2$"], ["B", "$x < 2$"], ["C", "$x > -2$"], ["D", "$x < -2$"]], answer: "B", explanation: "$-3x > -6$; сөрөгт хуваахад тэмдэг солигдоно: $x < 2$." },
  { key: "x25", grade: 9, topic: "g9-circle", type: "NUMERIC", difficulty: 2, text: "Дугуйн талбай $49\\pi$ бол радиусыг ол.", answer: "7", explanation: "$r^2 = 49$." },
  { key: "x26", grade: 9, topic: "g9-right-trig", type: "NUMERIC", difficulty: 2, text: "$\\sin 30^\\circ + \\cos 60^\\circ$-ийн утгыг ол.", answer: "1", explanation: "$\\frac{1}{2} + \\frac{1}{2} = 1$." },
  // 10-р анги
  { key: "x27", grade: 10, topic: "g10-logarithms", type: "NUMERIC", difficulty: 2, text: "Бод: $\\log_2 8 + \\log_2 4$", answer: "5", explanation: "$3 + 2 = 5$." },
  { key: "x28", grade: 10, topic: "g10-exponential", type: "NUMERIC", difficulty: 2, text: "Тэгшитгэлийг бод: $5^{2x - 1} = 125$", answer: "2", explanation: "$2x - 1 = 3 \\Rightarrow x = 2$." },
  { key: "x29", grade: 10, topic: "g10-exponential", type: "NUMERIC", difficulty: 3, text: "Тэгшитгэлийг бод: $9^x = 27$. Энгийн бутархайгаар бич.", answer: "3/2", explanation: "$3^{2x} = 3^3 \\Rightarrow x = \\frac{3}{2}$." },
  { key: "x30", grade: 10, topic: "g10-functions", type: "EXPRESSION", difficulty: 2, text: "$f(x) = 3x - 6$ функцийн урвуу функцийг ол.", answer: "(x + 6)/3", explanation: "$y = 3x - 6 \\Rightarrow x = \\frac{y + 6}{3}$." },
  { key: "x31", grade: 10, topic: "g10-combinatorics", type: "NUMERIC", difficulty: 2, text: "$4$ ялгаатай номыг тавиур дээр хэдэн янзаар эгнүүлж болох вэ?", answer: "24", explanation: "$4! = 24$." },
  { key: "x32", grade: 10, topic: "g10-combinatorics", type: "NUMERIC", difficulty: 3, text: "$5$ сурагчаас ахлагч, орлогч хоёрыг хэдэн янзаар сонгох вэ?", answer: "20", explanation: "Дараалал чухал: $A_5^2 = 5 \\cdot 4 = 20$." },
  { key: "x33", grade: 10, topic: "g10-unit-circle", type: "MULTIPLE_CHOICE", difficulty: 3, text: "$\\sin\\alpha = \\frac{3}{5}$ ба $\\alpha$ нь II мөчийн өнцөг бол $\\cos\\alpha$ хэд вэ?", options: [["A", "$\\frac{4}{5}$"], ["B", "$-\\frac{4}{5}$"], ["C", "$\\frac{3}{4}$"], ["D", "$-\\frac{3}{5}$"]], answer: "B", explanation: "$\\cos\\alpha = -\\sqrt{1 - \\frac{9}{25}} = -\\frac{4}{5}$ (II мөчид косинус сөрөг)." },
  // 11-р анги
  { key: "x34", grade: 11, topic: "g11-sequences", type: "NUMERIC", difficulty: 2, text: "Арифметик прогрессын $a_1 = 5$, $d = -2$ бол $a_6$-г ол.", answer: "-5", explanation: "$a_6 = 5 + 5\\cdot(-2) = -5$." },
  { key: "x35", grade: 11, topic: "g11-sequences", type: "NUMERIC", difficulty: 3, text: "$1 + 2 + 3 + \\ldots + 100$ нийлбэрийг ол.", answer: "5050", explanation: "$S = \\frac{(1 + 100)\\cdot 100}{2} = 5050$." },
  { key: "x36", grade: 11, topic: "g11-limits", type: "NUMERIC", difficulty: 2, text: "Хязгаарыг бод: $\\lim\\limits_{x \\to 3} \\frac{x^2 - 9}{x - 3}$", answer: "6", explanation: "$\\lim_{x\\to 3}(x + 3) = 6$." },
  { key: "x37", grade: 11, topic: "g11-trig-equations", type: "MULTIPLE_CHOICE", difficulty: 3, text: "$\\tan x = 1$ тэгшитгэлийн ерөнхий шийд аль нь вэ?", options: [["A", "$\\frac{\\pi}{4} + 2\\pi n$"], ["B", "$\\frac{\\pi}{4} + \\pi n$"], ["C", "$\\pm\\frac{\\pi}{4} + 2\\pi n$"], ["D", "$\\frac{\\pi}{2} + \\pi n$"]], answer: "B", explanation: "Тангенсийн үе нь $\\pi$." },
  { key: "x38", grade: 11, topic: "g11-statistics", type: "NUMERIC", difficulty: 3, text: "$1, 3, 5$ өгөгдлийн дисперсийг ($\\sigma^2 = \\frac{1}{n}\\sum(x_i - \\bar x)^2$) энгийн бутархайгаар ол.", answer: "8/3", explanation: "$\\bar x = 3$, $\\frac{4 + 0 + 4}{3} = \\frac{8}{3}$." },
  { key: "x39", grade: 11, topic: "g11-solids", type: "NUMERIC", difficulty: 2, text: "Радиус нь $3$, өндөр нь $4$ конусын эзлэхүүнийг ол. ($\\pi$ ашиглан эсвэл 1 оронгийн нарийвчлалтай)", answer: "12*pi", tolerance: 0.1, explanation: "$V = \\frac{1}{3}\\pi\\cdot 9\\cdot 4 = 12\\pi \\approx 37.7$." },
  // 12-р анги
  { key: "x40", grade: 12, topic: "g12-derivatives", type: "NUMERIC", difficulty: 2, text: "$f(x) = 4x^3 - x$ бол $f'(1)$-ийг ол.", answer: "11", explanation: "$f'(x) = 12x^2 - 1$, $f'(1) = 11$." },
  { key: "x41", grade: 12, topic: "g12-derivatives", type: "EXPRESSION", difficulty: 3, text: "$f(x) = x^2 \\sin x$ функцийн уламжлалыг ол.", answer: "2x*sin(x) + x^2*cos(x)", explanation: "Үржвэрийн дүрэм: $(x^2)'\\sin x + x^2(\\sin x)'$." },
  { key: "x42", grade: 12, topic: "g12-derivative-applications", type: "NUMERIC", difficulty: 3, text: "$[0;\\ 3]$ завсарт $f(x) = x^2 - 2x$ функцийн хамгийн их утгыг ол.", answer: "3", explanation: "$f(0) = 0$, $f(1) = -1$, $f(3) = 3$." },
  { key: "x43", grade: 12, topic: "g12-derivative-applications", type: "NUMERIC", difficulty: 4, text: "Периметр нь $20$ см тэгш өнцөгтүүдээс хамгийн их талбайг (см²) ол.", answer: "25", explanation: "$S = x(10 - x)$, $S' = 0 \\Rightarrow x = 5$, $S = 25$." },
  { key: "x44", grade: 12, topic: "g12-integrals", type: "NUMERIC", difficulty: 3, text: "Тодорхой интегралыг бод: $\\int_1^3 x^2\\,dx$. Энгийн бутархайгаар бич.", answer: "26/3", explanation: "$\\left[\\frac{x^3}{3}\\right]_1^3 = 9 - \\frac{1}{3} = \\frac{26}{3}$." },
  { key: "x45", grade: 12, topic: "g12-modeling", type: "NUMERIC", difficulty: 3, text: "Хадгаламж жилд $10\\%$ (нийлмэл) өсдөг. $1\\,000\\,000$₮ $3$ жилийн дараа хэдэн төгрөг болох вэ?", answer: "1331000", explanation: "$1\\,000\\,000 \\cdot 1.1^3 = 1\\,331\\,000$." },
];
