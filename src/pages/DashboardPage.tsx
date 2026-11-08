import { useEffect, useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type House } from "../api";


export function DashboardPage() {
  const navigate = useNavigate();
  const [houses, setHouses] = useState<House[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await api.get<House[]>("/houses");
    setHouses(response.data);
  }

  useEffect(() => {
    load().catch(() => {
      localStorage.removeItem("access_token");
      navigate("/login");
    });
  }, [navigate]);

  async function createHouse(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await api.post("/houses", { name, description: "" });
      setName("");
      await load();
    } catch {
      setError("Could not create the house.");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your houses</h1>
        <button
          className="text-sm text-muted"
          onClick={() => {
            localStorage.removeItem("access_token");
            navigate("/login");
          }}
        >
          Sign out
        </button>
      </header>
      <form onSubmit={createHouse} className="mt-6 flex gap-2">
        <input className="flex-1 rounded-lg border border-line bg-card px-3 py-2" placeholder="House name" value={name} onChange={(e) => setName(e.target.value)} required />
        <button className="rounded-lg bg-brand font-medium text-white hover:bg-brand-ink px-4" type="submit">Add</button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <ul className="mt-6 space-y-2">
        {houses.map((house) => (
          <li key={house.id} className="rounded-xl border border-line bg-card px-4 py-3">
  <Link className="font-medium text-brand" to={`/houses/${house.id}`}>
    {house.name}
  </Link>
  <p className="text-xs text-muted">{house.id}</p>
</li>
        ))}
        {houses.length === 0 && <li className="text-sm text-muted">No houses yet.</li>}
      </ul>
    </main>
  );
}
