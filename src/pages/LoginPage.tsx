import { useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, authErrorMessage } from "../api";
import { FormError, INPUT, ServerStatus, SubmitButton } from "../components/auth/AuthParts";
import { useBackendStatus } from "../lib/wake";

export function LoginPage() {
  const navigate = useNavigate();
  const server = useBackendStatus();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    const body = new URLSearchParams();
    body.set("username", email.trim());
    body.set("password", password);
    try {
      const response = await api.post("/auth/login", body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 60_000,
      });
      localStorage.setItem("access_token", response.data.access_token);
      navigate("/");
    } catch (caught) {
      setError(authErrorMessage(caught, { rejected: "Incorrect email or password." }));
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <ServerStatus />
      <form onSubmit={(event) => void onSubmit(event)} className="mt-6 space-y-3" aria-busy={loading}>
        <input className={INPUT} type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required />
        <input className={INPUT} type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required />
        {error && <FormError>{error}</FormError>}
        <SubmitButton busy={loading} disabled={loading || server === "waking"} idle={server === "waking" ? "Waiting for the server…" : "Sign in"} working="Signing in…" />
      </form>
      <Link className="mt-4 inline-block text-sm text-brand" to="/register">Create an account</Link>
    </main>
  );
}
