"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Ban, Globe, RotateCcw, Send, Trash2, Undo2 } from "lucide-react";
import { Button, Textarea } from "@/components/ui/primitives";
import { ConfirmButton, Modal } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";

export function StatusActions({ id, status, canDelete, isOwnQuestion, isAdmin }: { id: string; status: string; canDelete: boolean; isOwnQuestion: boolean; isAdmin: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [reject, setReject] = React.useState(false);
  const [comment, setComment] = React.useState("");

  const go = async (to: string, c?: string) => {
    setBusy(to);
    try {
      await api(`/api/admin/questions/${id}/status`, { method: "POST", json: { to, comment: c } });
      toast({ tone: "success", title: "Төлөв шинэчлэгдлээ" });
      setReject(false);
      router.refresh();
    } catch (e) {
      toast({ tone: "error", title: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const selfVerifyBlocked = isOwnQuestion && !isAdmin;

  return (
    <div className="flex flex-wrap gap-2">
      {(status === "DRAFT" || status === "REJECTED") && (
        <Button size="sm" onClick={() => go("NEEDS_REVIEW")} loading={busy === "NEEDS_REVIEW"}>
          <Send className="h-4 w-4" /> Хянуулахаар илгээх
        </Button>
      )}
      {status === "NEEDS_REVIEW" && (
        <>
          <Button size="sm" variant="success" onClick={() => go("VERIFIED")} loading={busy === "VERIFIED"} disabled={selfVerifyBlocked} title={selfVerifyBlocked ? "Өөрийн бодлогыг өөр хүн баталгаажуулна" : undefined}>
            <BadgeCheck className="h-4 w-4" /> Баталгаажуулах
          </Button>
          <Button size="sm" variant="outline" className="text-danger" onClick={() => setReject(true)}>
            <Ban className="h-4 w-4" /> Татгалзах
          </Button>
          <Button size="sm" variant="ghost" onClick={() => go("DRAFT")} loading={busy === "DRAFT"}>
            <Undo2 className="h-4 w-4" /> Ноорог руу
          </Button>
        </>
      )}
      {status === "VERIFIED" && (
        <>
          <Button size="sm" onClick={() => go("PUBLISHED")} loading={busy === "PUBLISHED"}>
            <Globe className="h-4 w-4" /> Нийтлэх
          </Button>
          <Button size="sm" variant="ghost" onClick={() => go("NEEDS_REVIEW")} loading={busy === "NEEDS_REVIEW"}>
            <RotateCcw className="h-4 w-4" /> Дахин хянуулах
          </Button>
        </>
      )}
      {status === "PUBLISHED" && (
        <Button size="sm" variant="outline" onClick={() => go("VERIFIED")} loading={busy === "VERIFIED"}>
          <Undo2 className="h-4 w-4" /> Нийтлэлээс буцаах
        </Button>
      )}
      {canDelete && (
        <ConfirmButton
          title="Бодлогыг устгах уу?"
          description="Энэ үйлдлийг буцаах боломжгүй."
          confirmLabel="Устгах"
          onConfirm={async () => {
            try {
              await api(`/api/admin/questions/${id}`, { method: "DELETE" });
              toast({ tone: "success", title: "Устгагдлаа" });
              router.replace("/admin/questions");
              router.refresh();
            } catch (e) {
              toast({ tone: "error", title: (e as Error).message });
            }
          }}
        >
          <Button size="sm" variant="ghost" className="text-danger">
            <Trash2 className="h-4 w-4" /> Устгах
          </Button>
        </ConfirmButton>
      )}
      <Modal
        open={reject}
        onClose={() => setReject(false)}
        title="Татгалзах шалтгаан"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReject(false)}>
              Болих
            </Button>
            <Button variant="danger" onClick={() => go("REJECTED", comment)} loading={busy === "REJECTED"} disabled={!comment.trim()}>
              Татгалзах
            </Button>
          </>
        }
      >
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Зохиогчид зориулсан тайлбар (жишээ нь: хариу буруу, нөхцөл дутуу)" />
      </Modal>
    </div>
  );
}
