"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";

export function StartExamButton({ examId, resumeId, disabled }: { examId: string; resumeId: string | null; disabled?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);
  return (
    <Button
      size="lg"
      className="w-full"
      disabled={disabled}
      loading={loading}
      onClick={async () => {
        if (resumeId) return router.push(`/student/exams/attempt/${resumeId}`);
        setLoading(true);
        try {
          const r = await api<{ attemptId: string }>(`/api/exams/${examId}/start`, { method: "POST" });
          router.push(`/student/exams/attempt/${r.attemptId}`);
        } catch (e) {
          toast({ tone: "error", title: (e as Error).message });
          setLoading(false);
        }
      }}
    >
      <Play className="h-4 w-4" /> {resumeId ? "Шалгалтаа үргэлжлүүлэх" : "Шалгалт эхлүүлэх"}
    </Button>
  );
}
