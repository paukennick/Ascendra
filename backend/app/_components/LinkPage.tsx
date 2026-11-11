// REQ-191: the shell shared by the pages opened from email links
// (verify-email, confirm-email-change, cancel-email-change). Plain server
// rendered HTML: the confirm button is a <form> posting to a server action,
// so it works without JavaScript.
export function LinkPage({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 480 }}>
      <h1>Ascendra</h1>
      {children}
    </main>
  );
}

export function ConfirmForm({
  action,
  token,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  token: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      <button type="submit" style={{ padding: 10, fontSize: 16 }}>
        {label}
      </button>
    </form>
  );
}

export const formToken = (formData: FormData): string | undefined => {
  const t = formData.get("token");
  return typeof t === "string" && t ? t : undefined;
};

export function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | null {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}
