import { verifyEmailToken } from "@/lib/auth/emailTokens";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = await verifyEmailToken(token);
  return (
    <main style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 480 }}>
      <h1>Ascendra</h1>
      <p>{result.message}</p>
      {result.setPasswordUrl ? (
        <p>
          <a href={result.setPasswordUrl}>Choose your password</a>
        </p>
      ) : null}
    </main>
  );
}
