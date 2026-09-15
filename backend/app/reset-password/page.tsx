"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setStatus("error");
      setMessage("Passwords don't match.");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setStatus("done");
      setMessage(data.message ?? "Password reset. You can close this page.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (!token) {
    return (
      <main style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 480 }}>
        <h1>Ascendra</h1>
        <p>Missing reset token. Use the link from your password reset email.</p>
      </main>
    );
  }

  if (status === "done") {
    return (
      <main style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 480 }}>
        <h1>Ascendra</h1>
        <p>{message}</p>
      </main>
    );
  }

  return (
    <main style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 480 }}>
      <h1>Ascendra</h1>
      <p>Choose a new password.</p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320 }}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
          style={{ padding: 8, fontSize: 16 }}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          required
          style={{ padding: 8, fontSize: 16 }}
        />
        <button type="submit" disabled={status === "submitting"} style={{ padding: 10, fontSize: 16 }}>
          {status === "submitting" ? "Resetting..." : "Reset password"}
        </button>
        {status === "error" ? <p style={{ color: "#b91c1c" }}>{message}</p> : null}
      </form>
    </main>
  );
}
