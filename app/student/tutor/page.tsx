import { Suspense } from "react";
import { requirePageRole } from "@/lib/auth";
import { isAiConfigured } from "@/services/ai/anthropic";
import { Skeleton } from "@/components/ui/primitives";
import { TutorClient } from "./tutor-client";

export const metadata = { title: "AI багш" };

export default async function TutorPage() {
  const user = await requirePageRole(["STUDENT"]);
  return (
    <Suspense fallback={<Skeleton className="h-[70vh] rounded-2xl" />}>
      <TutorClient aiReady={isAiConfigured()} defaultMode={user.explainMode as "BEGINNER" | "STANDARD" | "ADVANCED"} grade={user.grade} />
    </Suspense>
  );
}
