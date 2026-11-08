import { useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const body = new URLSearchParams();
    body.set("username", email);
    body.set("password", password);
    try {
      const response = await api.post("/auth/login", body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      localStorage.setItem("access_token", response.data.access_token);
      navigate("/");
    } catch {
      setError("Login failed. Check the email and password.");
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input className="w-full rounded-lg border border-line bg-card px-3 py-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded-lg border border-line bg-card px-3 py-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="w-full rounded-lg bg-brand font-medium text-white hover:bg-brand-ink px-3 py-2" type="submit">Sign in</button>
      </form>
      <Link className="mt-4 inline-block text-sm text-brand" to="/register">Create an account</Link>
    </main>
  );
}
