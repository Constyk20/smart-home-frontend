import { useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

export function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/auth/register", { email, password, full_name: fullName });
      navigate("/login");
    } catch {
      setError("Could not register. The email may already exist, or the password is under 8 characters.");
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input className="w-full rounded-lg border border-line bg-card px-3 py-2" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input className="w-full rounded-lg border border-line bg-card px-3 py-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded-lg border border-line bg-card px-3 py-2" type="password" placeholder="Password (min 8)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="w-full rounded-lg bg-brand font-medium text-white hover:bg-brand-ink px-3 py-2" type="submit">Register</button>
      </form>
      <Link className="mt-4 inline-block text-sm text-brand" to="/login">Back to sign in</Link>
    </main>
  );
}
