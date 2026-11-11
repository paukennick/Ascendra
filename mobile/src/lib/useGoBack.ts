import { useCallback } from "react";
import { useRouter } from "expo-router";
import { goBackOr } from "@/lib/goBack";

// A press handler for a "Back" control: back when there is a screen to return
// to, else `fallback` (see goBack.ts).
export function useGoBack(fallback: string): () => void {
  const router = useRouter();
  return useCallback(() => goBackOr(router, fallback), [router, fallback]);
}
