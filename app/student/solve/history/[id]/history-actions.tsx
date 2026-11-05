"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { ConfirmButton } from "@/components/ui/interactive";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";

export function HistoryActions({ id, isFavorite }: { id: string; isFavorite: boolean }) {
  const [fav, setFav] = React.useState(isFavorite);
  const router = useRouter();
  const toast = useToast();
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant={fav ? "primary" : "outline"}
        onClick={async () => {
          try {
            const r = await api<{ isFavorite: boolean }>(`/api/solver/history/${id}`, { method: "PATCH", json: { isFavorite: !fav } });
            setFav(r.isFavorite);
          } catch (e) {
            toast({ tone: "error", title: (e as Error).message });
          }
        }}
      >
        <Star className={cn("h-4 w-4", fav && "fill-current")} /> {fav ? "Хадгалсан" : "Хадгалах"}
      </Button>
      <ConfirmButton
        title="Түүхээс устгах уу?"
        description="Энэ бодлого болон хавсаргасан зураг бүрмөсөн устна."
        confirmLabel="Устгах"
        onConfirm={async () => {
          await api(`/api/solver/history/${id}`, { method: "DELETE" });
          toast({ tone: "success", title: "Устгагдлаа" });
          router.replace("/student/saved?tab=history");
          router.refresh();
        }}
      >
        <Button size="sm" variant="outline" className="text-danger">
          <Trash2 className="h-4 w-4" /> Устгах
        </Button>
      </ConfirmButton>
    </div>
  );
}
