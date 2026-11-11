import React from "react";
import { useRouter } from "expo-router";
import { ErrorBanner } from "@/components/ui";
import { HOME } from "@/lib/goBack";
import { NOT_FOUND_ACTION_LABEL } from "@/lib/notFound";

// REQ-206 (FAIL-926): a screen's load error. When the thing it asked for
// doesn't exist (`notFound`, from isNotFound(err)) Retry can never succeed, so
// it offers "Go to my courses" instead.
export function LoadError({
  message,
  notFound,
  onRetry,
}: {
  message: string;
  notFound?: boolean;
  onRetry?: () => void | Promise<unknown>;
}) {
  const router = useRouter();
  return (
    <ErrorBanner
      message={message}
      onRetry={notFound ? undefined : onRetry}
      escape={notFound ? { label: NOT_FOUND_ACTION_LABEL, onPress: () => router.replace(HOME) } : undefined}
    />
  );
}
