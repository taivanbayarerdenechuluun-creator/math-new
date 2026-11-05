// Сервер ба клиент хоёуланд ашиглах бодлогын ноорог бүтэц
import type { QuestionType } from "@/lib/constants";

export interface TopicOption {
  id: string;
  title: string;
  gradeId: number;
  unit: string;
}

export interface QuestionDraft {
  gradeId: number;
  topicId: string | null;
  type: QuestionType;
  difficulty: number;
  title: string;
  text: string;
  correctAnswer: string;
  tolerance: string;
  explanation: string;
  relatedFormulas: string[];
  tags: string;
  sourceName: string;
  options: { label: string; text: string; isCorrect: boolean }[];
  solutionMethod: string;
  solutionSteps: { title: string; latex: string; explanation: string }[];
  originalFileId: string | null;
}

export const emptyDraft = (grade = 9): QuestionDraft => ({
  gradeId: grade,
  topicId: null,
  type: "MULTIPLE_CHOICE",
  difficulty: 2,
  title: "",
  text: "",
  correctAnswer: "",
  tolerance: "",
  explanation: "",
  relatedFormulas: [],
  tags: "",
  sourceName: "",
  options: ["A", "B", "C", "D"].map((label) => ({ label, text: "", isCorrect: false })),
  solutionMethod: "",
  solutionSteps: [],
  originalFileId: null,
});

