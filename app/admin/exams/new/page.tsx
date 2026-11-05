import { requirePageRole, STAFF } from "@/lib/auth";
import { loadPublishedQuestions } from "@/features/examinations/load";
import { PageHeader } from "@/components/ui/primitives";
import { ExamForm } from "@/components/examination/exam-form";

export const metadata = { title: "Шинэ шалгалт" };

export default async function NewExam() {
  await requirePageRole(STAFF);
  const pool = await loadPublishedQuestions();
  return (
    <div>
      <PageHeader eyebrow="Шалгалт" title="Шинэ шалгалт үүсгэх" />
      <ExamForm
        pool={pool}
        initial={{ title: "", description: "", gradeId: 9, durationMinutes: 30, passingScore: 60, randomize: true, showSolutions: true, isPublished: false, availableFrom: "", availableTo: "", questions: [] }}
      />
    </div>
  );
}
