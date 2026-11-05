import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileImage, History, ScanText, Sparkles } from "lucide-react";
import { requirePageRole, STAFF, canManageGrade } from "@/lib/auth";
import { isAiConfigured } from "@/services/ai/anthropic";
import { loadQuestionDraft, loadTopicOptions } from "@/features/question-bank/load";
import { Alert, Badge, Card, CardBody, CardHeader, STATUS_TONE } from "@/components/ui/primitives";
import { QuestionEditor } from "@/components/questions/question-editor";
import { StatusActions } from "@/components/questions/status-actions";
import { MathText } from "@/components/mathematics/math-text";
import { QUESTION_STATUS_LABELS, type QuestionStatus } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

const ACTION_LABEL: Record<string, string> = {
  APPROVE: "Баталгаажуулсан",
  REJECT: "Татгалзсан",
  PUBLISH: "Нийтэлсэн",
  UNPUBLISH: "Нийтлэлээс буцаасан",
  SUBMIT: "Хянуулахаар илгээсэн",
  EDIT: "Засварласан",
  COMMENT: "Сэтгэгдэл",
};

export default async function QuestionDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageRole(STAFF);
  const { id } = await params;
  const [loaded, topics] = await Promise.all([loadQuestionDraft(id), loadTopicOptions()]);
  if (!loaded) notFound();
  const { q, draft } = loaded;
  const canEdit = await canManageGrade(user, q.gradeId);
  const hasOriginal = Boolean(q.originalText || (q.originalFile && q.originalFile.purpose === "QUESTION_IMPORT"));
  const canDelete = q.status !== "PUBLISHED" && q._count.examLinks === 0 && (user.role === "ADMIN" || q.authorId === user.id);

  const header = (
    <div className="mb-5 space-y-4">
      <Link href="/admin/questions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Бодлогын сан
      </Link>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-semibold">{q.code}</h1>
            <Badge tone={STATUS_TONE[q.status]}>{QUESTION_STATUS_LABELS[q.status as QuestionStatus]}</Badge>
            {q.aiGenerated && (
              <Badge tone="warning">
                <Sparkles className="h-3 w-3" /> AI санал агуулсан
              </Badge>
            )}
            {q.ocrConfidence != null && <Badge tone={q.ocrConfidence >= 0.85 ? "success" : "warning"}>OCR итгэл {Math.round(q.ocrConfidence * 100)}%</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">
            Зохиогч: {q.author?.name ?? "—"} · Хянагч: {q.reviewer?.name ?? "—"} · {q.timesAnswered} удаа хариулсан ({q.timesAnswered ? Math.round((q.timesCorrect / q.timesAnswered) * 100) : 0}% зөв)
          </p>
        </div>
        {canEdit && <StatusActions id={q.id} status={q.status} canDelete={canDelete} isOwnQuestion={q.authorId === user.id} isAdmin={user.role === "ADMIN"} />}
      </div>
      {q.status === "NEEDS_REVIEW" && (
        <Alert tone="warning" title="Баталгаажуулалт хүлээж байна">
          Нөхцөл, хариу, бодолтыг эх сурвалжтай тулган шалгаад баталгаажуулна уу. AI-ийн санал болгосон хариуг хэзээ ч шалгалгүйгээр баталгаажуулж болохгүй.
        </Alert>
      )}
      {q.status === "PUBLISHED" && <Alert tone="info">Нийтлэгдсэн бодлогын нөхцөл эсвэл хариуг өөрчилбөл дахин хянуулах төлөвт шилжинэ.</Alert>}
      {!canEdit && <Alert tone="warning">Танд энэ ангийн бодлогыг засах эрх олгогдоогүй байна.</Alert>}
    </div>
  );

  const history = (
    <Card>
      <CardHeader title="Хяналтын түүх" icon={<History className="h-4 w-4" />} />
      <CardBody className="pt-3">
        {q.reviews.length === 0 ? (
          <p className="text-sm text-muted">Түүх алга.</p>
        ) : (
          <ol className="space-y-3">
            {q.reviews.map((r) => (
              <li key={r.id} className="border-l-2 border-border pl-3 text-sm">
                <p className="font-semibold">{ACTION_LABEL[r.action] ?? r.action}</p>
                <p className="text-xs text-subtle">
                  {r.reviewer.name} · {formatDateTime(r.createdAt)}
                </p>
                {r.comment && <p className="mt-1 text-muted">{r.comment}</p>}
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );

  if (!hasOriginal) {
    return (
      <div className="mx-auto max-w-5xl">
        {header}
        <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
          {canEdit ? <QuestionEditor topics={topics} initial={draft} questionId={q.id} aiReady={isAiConfigured()} /> : <Card><CardBody><MathText text={q.text} /></CardBody></Card>}
          <div className="xl:sticky xl:top-20 xl:h-fit">{history}</div>
        </div>
      </div>
    );
  }

  // Баталгаажуулалтын хуваагдсан дэлгэц: зүүн — эх сурвалж, баруун — засах боломжтой бүтэц
  return (
    <div>
      {header}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4 xl:sticky xl:top-20 xl:h-[calc(100dvh-6rem)] xl:overflow-y-auto">
          <Card>
            <CardHeader title="Эх сурвалж" description="Скан хийсэн зураг / PDF хуудас" icon={<FileImage className="h-4 w-4" />} />
            <CardBody>
              {q.originalFile ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/files/${q.originalFile.id}`} alt="Эх зураг" className="w-full rounded-xl border border-border bg-white object-contain" />
              ) : (
                <p className="text-sm text-muted">Эх зураг хавсаргаагүй.</p>
              )}
            </CardBody>
          </Card>
          {q.originalText && (
            <Card>
              <CardHeader title="OCR-ийн анхны текст (өөрчлөгдөөгүй)" icon={<ScanText className="h-4 w-4" />} />
              <CardBody>
                <pre className="whitespace-pre-wrap rounded-xl bg-surface-2/60 p-3 font-mono text-xs text-muted">{q.originalText}</pre>
              </CardBody>
            </Card>
          )}
          {history}
        </div>
        <div>{canEdit ? <QuestionEditor topics={topics} initial={draft} questionId={q.id} aiReady={isAiConfigured()} compact /> : <MathText text={q.text} />}</div>
      </div>
    </div>
  );
}
