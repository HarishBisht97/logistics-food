import { useState, type FormEvent } from "react";
import logo from "../data/iitb.svg";

const field =
  "mt-1 h-12 w-full rounded-xl border border-line bg-white px-4 text-base outline-none focus:border-primary";

export function LoginPage({
  onSignIn,
  onSignUp,
  error,
}: {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  error: string | null;
}) {
  const [mode, setMode] = useState<"sign-in" | "create">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const creating = mode === "create";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (creating) await onSignUp(email, password);
      else await onSignIn(email, password);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8 sm:px-6">
      <form
        onSubmit={(event) => void submit(event)}
        className="w-full max-w-sm rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8"
      >
        <img src={logo} alt="" className="mx-auto h-16 w-16 object-contain" />
        <h1 className="mt-3 text-center text-2xl font-bold tracking-tight">
          IPT APC food
        </h1>
        <label className="mt-8 block text-sm font-semibold">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={field}
          />
        </label>
        <label className="mt-3 block text-sm font-semibold">
          Password
          <input
            type="password"
            autoComplete={creating ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={field}
          />
        </label>
        {error && <p className="mt-4 text-sm text-chili">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 h-14 w-full rounded-2xl bg-primary text-base font-semibold text-white transition-colors duration-150 ease-out disabled:bg-fill disabled:text-muted"
        >
          {busy ? "Please wait…" : creating ? "Create account" : "Sign in"}
        </button>
        <button
          type="button"
          className="mt-3 min-h-11 w-full text-sm font-semibold text-primary"
          onClick={() => setMode(creating ? "sign-in" : "create")}
        >
          {creating
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
      </form>
    </main>
  );
}
