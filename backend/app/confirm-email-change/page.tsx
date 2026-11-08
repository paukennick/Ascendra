import { confirmEmailChangeToken } from "@/lib/auth/emailTokens";

export const dynamic = "force-dynamic";

export default async function ConfirmEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = await confirmEmailChangeToken(token);
  return (
    <main style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 480 }}>
      <h1>Ascendra</h1>
      <p>{result.message}</p>
    </main>
  );
}
