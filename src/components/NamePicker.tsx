import { useState } from "react";
import { Header, Splash } from "./Header";
import { rosterFor, type Side } from "../lib/constants";
import { messageOf } from "../lib/errors";
import { claimName } from "../lib/ordersRepo";
import { getDb } from "../firebase";
import { useClaims } from "../hooks/useDirectory";

export function NamePicker({
  uid,
  email,
  side,
  onSignOut,
}: {
  uid: string;
  email: string;
  side: Side;
  onSignOut: () => void;
}) {
  const { claims, error: loadError } = useClaims(side);
  const names = rosterFor(side);
  const [chosen, setChosen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!chosen) return;
    setSaving(true);
    setError(null);
    try {
      await claimName(getDb(), uid, email, chosen, side);
    } catch (err) {
      setError(messageOf(err));
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header email={email} subtitle="Pick your name" onSignOut={onSignOut} />
      <main className="mx-auto max-w-3xl px-4 py-6 pb-28">
        <h1 className="text-2xl font-bold tracking-tight">Who are you?</h1>
        <p className="mt-1 text-sm text-muted">You only do this once. Two people can’t share a name.</p>
        {loadError && <p className="mt-3 text-sm text-chili">{loadError}</p>}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {names.map((name) => {
            const taken = Boolean(claims[name]);
            const selected = chosen === name;
            return (
              <button
                key={name}
                type="button"
                disabled={taken || saving}
                onClick={() => setChosen(name)}
                className={`min-h-12 rounded-2xl border px-3 py-2 text-left text-sm font-semibold shadow-card ${
                  taken
                    ? "border-line bg-fill text-muted"
                    : selected
                      ? "border-primary bg-white text-primary"
                      : "border-line bg-white"
                }`}
              >
                {name}
                {taken && <span className="mt-0.5 block text-xs font-normal">Taken</span>}
              </button>
            );
          })}
        </div>
        {error && <p className="mt-4 text-sm text-chili">{error}</p>}
        <button
          type="button"
          disabled={!chosen || saving}
          onClick={() => void save()}
          className="mt-4 h-12 w-full rounded-2xl bg-primary text-base font-semibold text-white disabled:bg-fill disabled:text-muted"
        >
          {saving ? "Saving…" : "This is me"}
        </button>
      </main>
    </div>
  );
}

export function Checking({ label }: { label: string }) {
  return <Splash label={label} />;
}
