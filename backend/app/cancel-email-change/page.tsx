import { cancelEmailChangeToken } from "@/lib/auth/emailTokens";

export const dynamic = "force-dynamic";

// REQ-116: the link in the alert sent to the current address when an email
// change is requested (lib/auth/emailTokens.ts).
export default async function CancelEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = await cancelEmailChangeToken(token);
  return (
    <main style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 480 }}>
      <h1>Ascendra</h1>
      <p>{result.message}</p>
    </main>
  );
}
