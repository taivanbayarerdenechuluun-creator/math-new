"use client";
import { useRouter } from "next/navigation";
import { BookmarkX } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";

export function UnsaveButton({ questionId }: { questionId: string }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <button
      onClick={async () => {
        try {
          await api("/api/saved", { method: "DELETE", json: { questionId } });
          router.refresh();
        } catch (e) {
          toast({ tone: "error", title: (e as Error).message });
        }
      }}
      className="rounded-lg p-2 text-subtle hover:bg-danger-soft hover:text-danger"
      aria-label="Хадгалснаас хасах"
      title="Хадгалснаас хасах"
    >
      <BookmarkX className="h-5 w-5" />
    </button>
  );
}
