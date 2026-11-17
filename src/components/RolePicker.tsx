import { useState } from "react";
import { Header } from "./Header";
import { getDb } from "../firebase";
import { messageOf } from "../lib/errors";
import { chooseSide } from "../lib/ordersRepo";
import type { Side } from "../lib/constants";

const CHOICES: { side: Side; title: string; detail: string }[] = [
  { side: "apc", title: "APC", detail: "Order with the APC team." },
  { side: "placement", title: "Placement manager", detail: "Order with the placement team." },
];

export function RolePicker({
  uid,
  email,
  onSignOut,
}: {
  uid: string;
  email: string;
  onSignOut: () => void;
}) {
  const [busy, setBusy] = useState<Side | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(side: Side) {
    setBusy(side);
    setError(null);
    try {
      await chooseSide(getDb(), uid, email, side);
    } catch (err) {
      setError(messageOf(err));
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen">
      <Header email={email} subtitle="Choose your group" onSignOut={onSignOut} />
      <main className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-2xl font-bold tracking-tight">Who is ordering?</h1>
        <p className="mt-1 text-sm text-muted">You only do this once. Then you pick your name.</p>
        <div className="mt-4 grid gap-3">
          {CHOICES.map((choice) => (
            <button
              key={choice.side}
              type="button"
              disabled={busy !== null}
              onClick={() => void pick(choice.side)}
              className="min-h-16 rounded-2xl border border-line bg-white px-4 py-3 text-left shadow-card disabled:opacity-60"
            >
              <span className="block text-base font-semibold">{choice.title}</span>
              <span className="mt-0.5 block text-sm text-muted">
                {busy === choice.side ? "Saving…" : choice.detail}
              </span>
            </button>
          ))}
        </div>
        {error && <p className="mt-4 text-sm text-chili">{error}</p>}
      </main>
    </div>
  );
}
