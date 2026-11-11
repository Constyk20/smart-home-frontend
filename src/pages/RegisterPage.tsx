import { useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, authErrorMessage } from "../api";
import { FormError, INPUT, ServerStatus, SubmitButton } from "../components/auth/AuthParts";
import { useBackendStatus } from "../lib/wake";

export function RegisterPage() {
  const navigate = useNavigate();
  const server = useBackendStatus();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    if (password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/register", { email: email.trim(), password, full_name: fullName.trim() }, { timeout: 60_000 });
      navigate("/login");
    } catch (caught) {
      setError(
        authErrorMessage(caught, {
          rejected: "Could not create the account. Please check your details and try again.",
          invalid: "Some details look wrong. Check the email address and use a password of at least 8 characters.",
          conflict: "An account with this email already exists. Try signing in instead.",
        }),
      );
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <ServerStatus />
      <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-3" aria-busy={loading}>
        <input className={INPUT} placeholder="Full name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={loading} required />
        <input className={INPUT} type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required />
        <input className={INPUT} type="password" placeholder="Password (min 8)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required />
        {error && <FormError>{error}</FormError>}
        <SubmitButton busy={loading} disabled={loading || server === "waking"} idle={server === "waking" ? "Waiting for the server…" : "Register"} working="Creating account…" />
      </form>
      <Link className="mt-4 inline-block text-sm text-brand" to="/login">Back to sign in</Link>
    </main>
  );
}
