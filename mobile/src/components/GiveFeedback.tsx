import React from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui";
import { canGiveFeedback, feedbackHref, GIVE_FEEDBACK_LABEL } from "@/lib/reviewers";

// REQ-331: "Give feedback" for reviewers (and owners), carrying the course and
// sim it was pressed on. Nothing at all for anyone else; the server checks too.
export function GiveFeedbackButton({ trackId, simId }: { trackId?: string | null; simId?: string | null }) {
  const router = useRouter();
  const { user } = useAuth();
  if (!canGiveFeedback(user)) return null;
  const label = simId ? "Give reviewer feedback on this sim" : trackId ? "Give reviewer feedback on this course" : GIVE_FEEDBACK_LABEL;
  return <Button label={label} variant="ghost" icon="message-square" onPress={() => router.push(feedbackHref({ trackId, simId }))} />;
}
