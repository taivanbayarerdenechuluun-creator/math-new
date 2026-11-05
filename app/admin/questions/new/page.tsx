import { requirePageRole, STAFF } from "@/lib/auth";
import { isAiConfigured } from "@/services/ai/anthropic";
import { loadTopicOptions } from "@/features/question-bank/load";
import { PageHeader } from "@/components/ui/primitives";
import { QuestionEditor } from "@/components/questions/question-editor";
import { emptyDraft } from "@/components/questions/draft";

export const metadata = { title: "Шинэ бодлого" };

export default async function NewQuestionPage() {
  await requirePageRole(STAFF);
  const topics = await loadTopicOptions();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Бодлогын сан" title="Шинэ бодлого үүсгэх" description="Үүсгэсэн бодлого өөр багш эсвэл админ баталгаажуулсны дараа нийтлэгдэнэ." />
      <QuestionEditor topics={topics} initial={emptyDraft()} aiReady={isAiConfigured()} />
    </div>
  );
}
