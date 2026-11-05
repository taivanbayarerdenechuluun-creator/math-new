// Бодолтын нэгдсэн бүтэц — symbolic хөдөлгүүр ба AI хоёулаа энэ хэлбэрээр буцаана.
// 8 хэсэг: нөхцөл, өгөгдсөн, олох, томьёо, алхмууд (+тайлбар), эцсийн хариу, шалгах арга.

export interface SolutionStep {
  title: string;
  latex?: string; // KaTeX-ээр харуулах илэрхийлэл
  explanation: string; // яагаад энэ алхмыг хийж байгаа тайлбар
}

export interface SolutionResult {
  problem: string; // бодлогын нөхцөл (LaTeX эсвэл $...$ агуулсан текст)
  kind: string; // LINEAR_EQUATION, QUADRATIC_EQUATION, SYSTEM, ...
  topic: string; // монгол нэр
  given: string[];
  find: string;
  formulas: { name: string; latex: string }[];
  methodReason?: string; // энэ аргыг яагаад сонгосон
  steps: SolutionStep[];
  finalAnswer: string; // энгийн текст хэлбэр (харьцуулахад)
  finalAnswerLatex: string;
  check: { method: string; steps: string[]; passed: boolean | null };
  alternatives?: { title: string; steps: SolutionStep[] }[];
  engine: "SYMBOLIC" | "AI" | "AI+SYMBOLIC";
  verification: "VERIFIED" | "MISMATCH" | "UNVERIFIED";
  verificationNote: string;
  numeric?: number[]; // хариуны тоон утгууд (шалгалтад)
}
