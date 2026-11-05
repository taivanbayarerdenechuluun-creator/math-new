"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";

export function CompleteLessonButton({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  const [done, setDone] = React.useState(completed);
  const [loading, setLoading] = React.useState(false);
  const toast = useToast();
  const router = useRouter();

  if (done)
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-success">
        <CheckCircle2 className="h-5 w-5" /> Хичээлийг дуусгасан
      </p>
    );

  return (
    <Button
      variant="success"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const r = await api<{ xp: number; achievements: { title: string }[] }>(`/api/lessons/${lessonId}/complete`, { method: "POST" });
          setDone(true);
          toast({ tone: "success", title: `Хичээл дууслаа! +${r.xp} XP` });
          r.achievements.forEach((a) => toast({ tone: "info", title: `🏆 Шинэ амжилт: ${a.title}` }));
          router.refresh();
        } catch (e) {
          toast({ tone: "error", title: (e as Error).message });
        } finally {
          setLoading(false);
        }
      }}
    >
      <CheckCircle2 className="h-4 w-4" /> Хичээлийг дуусгасан гэж тэмдэглэх
    </Button>
  );
}
