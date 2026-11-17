import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Header } from "./Header";
import { getDb } from "../firebase";
import { useAdminList } from "../hooks/useAdmin";
import { grantAdmin, revokeAdmin } from "../lib/adminsRepo";
import { useBudget } from "../hooks/useBudget";
import { useClaims, useUsers } from "../hooks/useDirectory";
import { useDayFeed } from "../hooks/useDayOrders";
import { ADMIN_EMAILS, headcountFor, rosterFor, sortByRoster, type Side } from "../lib/constants";
import { todayKolkata } from "../lib/dates";
import { messageOf } from "../lib/errors";
import { MENU, priceOf } from "../lib/menu";
import {
  budgetLeftPaise,
  formatPaise,
  limitPaise,
  toPaise,
} from "../lib/money";
import { releaseName } from "../lib/ordersRepo";
import { buildCsv, downloadCsv } from "../lib/csv";
import {
  describeItems,
  extrasHeadline,
  kitchenLines,
  liveOrders,
  orderStatus,
  ordersOverLimit,
  placedExtraPaise,
  placedMainPaise,
  placedPeopleCount,
} from "../lib/status";
import type { StoredOrder } from "../types";

export function AdminPage({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const [date, setDate] = useState(todayKolkata);
  const [side, setSide] = useState<Side>("apc");
  return (
    <div className="min-h-screen">
      <Header email={email} subtitle="Admin" onSignOut={onSignOut} />
      <AdminDay key={`${date}:${side}`} date={date} side={side} onDate={setDate} onSide={setSide} />
    </div>
  );
}

function AdminDay({
  date,
  side,
  onDate,
  onSide,
}: {
  date: string;
  side: Side;
  onDate: (date: string) => void;
  onSide: (side: Side) => void;
}) {
  const budget = useBudget(date, side);
  const feed = useDayFeed(date, side);
  const { claims } = useClaims(side);
  const roster = rosterFor(side);
  const headcount = headcountFor(side);
  const { users } = useUsers();
  const [draft, setDraft] = useState("");
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(String(budget.amount));
  }, [budget.amount, date]);

  const live = useMemo(() => liveOrders(feed.orders, feed.pointers), [feed.orders, feed.pointers]);
  const rows = useMemo(() => {
    return [...live].sort(
      (a, b) =>
        rosterIndex(roster, sortByRoster(a.members, roster)[0] ?? "") -
        rosterIndex(roster, sortByRoster(b.members, roster)[0] ?? ""),
    );
  }, [live, roster]);
  const covered = new Set(live.flatMap((order) => order.members));
  const missing = roster.filter((name) => !covered.has(name));
  const mains = placedMainPaise(live);
  const extras = placedExtraPaise(live);
  const left = budgetLeftPaise(budget.amount, mains);
  const headline = extrasHeadline(budget.amount, mains, extras);
  const overBudget = mains > toPaise(budget.amount);
  const kitchen = kitchenLines(live, MENU);
  const placedExtras = live.filter(
    (order) => order.placed && (Object.values(order.extras).some((qty) => qty > 0) || order.note.trim()),
  );

  async function saveBudget() {
    const value = Number(draft.replace(/,/g, "").trim());
    if (!Number.isFinite(value) || value <= 0) {
      setBudgetError("Enter a budget greater than 0.");
      return;
    }
    setBudgetError(null);
    await budget.save(value);
  }

  async function release(name: string, uid: string | null) {
    if (!window.confirm(`Release ${name}? They can pick a name again.`)) return;
    setReleaseError(null);
    try {
      await releaseName(getDb(), side, name, uid);
    } catch (err) {
      setReleaseError(messageOf(err));
    }
  }

  function download() {
    const csv = buildCsv(date, live, budget.amount, headcount, roster);
    const prefix = side === "placement" ? "ipt-placement-food" : "ipt-apc-food";
    downloadCsv(`${prefix}-${date}.csv`, csv);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Ordering group">
        <SideButton active={side === "apc"} onClick={() => onSide("apc")}>
          APC
        </SideButton>
        <SideButton active={side === "placement"} onClick={() => onSide("placement")}>
          Placement managers
        </SideButton>
      </div>

      <AdminGrants />

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium">
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => onDate(event.target.value)}
            className="mt-1 block h-12 rounded-xl border border-line bg-white px-3 text-base"
          />
        </label>
        <button type="button" onClick={download} className="h-12 rounded-2xl bg-primary px-4 text-sm font-semibold text-white">
          Download CSV
        </button>
      </div>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void saveBudget();
        }}
      >
        <label className="text-sm font-medium">
          Budget for this date ₹
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            inputMode="decimal"
            className="mt-1 block h-12 w-40 rounded-xl border border-line bg-white px-3 text-base"
          />
        </label>
        <button type="submit" className="h-12 rounded-2xl bg-primary px-4 text-sm font-semibold text-white">
          {budget.status === "saving" ? "Saving…" : "Save"}
        </button>
        <p className="text-sm text-muted">
          Per person {formatPaise(limitPaise(budget.amount, 1, headcount))}
          {budget.status === "saved" && " · Saved"}
        </p>
      </form>
      {(budgetError || budget.error) && <p className="text-sm text-chili">{budgetError || budget.error}</p>}
      {feed.error && <p className="text-sm text-chili">{feed.error}</p>}

      <section className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4">
        <Card
          label="Placed main orders"
          value={formatPaise(mains)}
          hint={`of ${formatPaise(toPaise(budget.amount))}`}
          tone={overBudget ? "red" : "green"}
        />
        <Card label="People who placed" value={`${placedPeopleCount(live, roster)} / ${headcount}`} />
        <Card label="Orders over limit" value={String(ordersOverLimit(live, budget.amount, headcount))} />
        <Card
          label="Budget left"
          value={formatPaise(left)}
          tone={left < 0 ? "red" : "green"}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold">Main orders</h2>
        <div className="mt-2 overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Name / group</th>
                <th className="px-3 py-2 font-medium">Items</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <OrderRow key={order.id} order={order} budget={budget.amount} headcount={headcount} roster={roster} />
              ))}
              {missing.map((name) => (
                <tr key={name} className="border-t align-top">
                  <td className="px-3 py-3">
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-muted">1 person · limit {formatPaise(limitPaise(budget.amount, 1, headcount))}</div>
                  </td>
                  <td className="px-3 py-3 text-muted">—</td>
                  <td className="px-3 py-3 text-muted">—</td>
                  <td className="px-3 py-3">
                    <Pill tone="grey">no order</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Extra orders</h2>
        <p className="mt-1 text-sm">
          Budget left after main orders {formatPaise(headline.left)} · Extras total {formatPaise(headline.extraPaise)}
          {" · "}
          {extras === 0 ? (
            <span className="text-muted">No placed extras</span>
          ) : headline.fit.ok ? (
            <span className="font-medium text-leaf">all extras fit</span>
          ) : (
            <span className="font-medium text-chili">
              extras exceed leftover by {formatPaise(headline.fit.overPaise)}
            </span>
          )}
        </p>
        <div className="mt-2 overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
          <table className="min-w-[640px] w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Extra items</th>
                <th className="px-3 py-2 font-medium">Cost</th>
                <th className="px-3 py-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {placedExtras.map((order) => (
                <tr key={order.id} className="border-t align-top">
                  <td className="px-3 py-3">{sortByRoster(order.members, roster).join(", ")}</td>
                  <td className="px-3 py-3">{describeItems(order.extras) || "—"}</td>
                  <td className="px-3 py-3 font-mono">
                    {formatPaise(Object.entries(order.extras).reduce((sum, [id, qty]) => sum + toPaise(priceOf(id)) * qty, 0))}
                  </td>
                  <td className="px-3 py-3">{order.note.trim() || "—"}</td>
                </tr>
              ))}
              {placedExtras.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-muted" colSpan={4}>
                    No placed extras.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Kitchen summary</h2>
        <p className="text-sm text-muted">Combined quantity across placed main orders.</p>
        <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-white shadow-card">
          {kitchen.map((line) => (
            <li key={line.item.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{line.item.name}</span>
              <span className="font-mono font-medium">× {line.qty}</span>
            </li>
          ))}
          {kitchen.length === 0 && <li className="px-3 py-3 text-sm text-muted">No placed main orders yet.</li>}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Release a name</h2>
        <ul className="mt-2 space-y-2">
          {roster.map((name) => {
            const owner = users.find((user) => user.name === name);
            const uid = owner?.uid ?? claims[name] ?? null;
            if (!uid) return null;
            return (
                <li key={name} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-3 py-2 shadow-card">
                <span className="min-w-0">
                  <span className="font-medium">{name}</span>
                  {owner?.email && <span className="ml-2 break-all text-sm text-muted">{owner.email}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => void release(name, uid)}
                  className="h-11 shrink-0 rounded-full border border-line px-3 text-sm"
                >
                  Release
                </button>
              </li>
            );
          })}
        </ul>
        {roster.every((name) => !claims[name] && !users.some((user) => user.name === name)) && (
          <p className="mt-2 text-sm text-muted">No names claimed yet.</p>
        )}
        {releaseError && <p className="mt-2 text-sm text-chili">{releaseError}</p>}
      </section>
    </main>
  );
}

function OrderRow({
  order,
  budget,
  headcount,
  roster,
}: {
  order: StoredOrder;
  budget: number;
  headcount: number;
  roster: readonly string[];
}) {
  const names = sortByRoster(order.members, roster).join(", ");
  const size = order.members.length;
  const status = orderStatus(order, budget, priceOf, headcount);
  const total = Object.entries(order.items).reduce((sum, [id, qty]) => sum + toPaise(priceOf(id)) * qty, 0);
  return (
    <tr className="border-t align-top">
      <td className="px-3 py-3">
        <div className="font-medium">{names}</div>
        <div className="text-xs text-muted">
          {size === 1 ? "1 person" : `${size} people`} · limit {formatPaise(limitPaise(budget, size, headcount))}
        </div>
      </td>
      <td className="px-3 py-3">{describeItems(order.items) || "—"}</td>
      <td className="px-3 py-3 font-mono">{formatPaise(total)}</td>
      <td className="px-3 py-3">
        <Pill tone={status.tone}>{status.label}</Pill>
      </td>
    </tr>
  );
}

function Card({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "green" | "red" | "neutral";
}) {
  const color = tone === "green" ? "text-leaf" : tone === "red" ? "text-chili" : "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-white p-3 shadow-card">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 font-mono text-xl font-medium ${color}`}>{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Pill({ tone, children }: { tone: "green" | "red" | "grey"; children: string }) {
  const color =
    tone === "green" ? "bg-leaf/15 text-leaf" : tone === "red" ? "bg-chili/10 text-chili" : "bg-fill text-muted";
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${color}`}>{children}</span>;
}

function AdminGrants() {
  const { emails, error: loadError } = useAdminList();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const permanent = ADMIN_EMAILS[0];

  async function grant(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await grantAdmin(getDb(), draft);
      setDraft("");
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(email: string) {
    if (!window.confirm(`Remove ${email} as admin?`)) return;
    setError(null);
    try {
      await revokeAdmin(getDb(), email);
    } catch (err) {
      setError(messageOf(err));
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">Admins</h2>
      <p className="mt-1 text-sm text-muted">They become an admin the next time they sign in with that email.</p>
      <ul className="mt-3 space-y-2">
        <li className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-line bg-white px-3 py-2 shadow-card">
          <span className="break-all font-medium">{permanent}</span>
          <span className="shrink-0 text-xs text-muted">Permanent</span>
        </li>
        {emails.map((email) => (
          <li
            key={email}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-3 py-2 shadow-card"
          >
            <span className="min-w-0 break-all font-medium">{email}</span>
            <button
              type="button"
              onClick={() => void revoke(email)}
              className="h-11 shrink-0 rounded-full border border-line px-3 text-sm"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(event) => void grant(event)}>
        <label className="text-sm font-medium">
          Email
          <input
            type="email"
            required
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="mt-1 block h-12 w-72 max-w-full rounded-xl border border-line bg-white px-3 text-base"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="h-12 rounded-2xl bg-primary px-4 text-sm font-semibold text-white disabled:bg-fill disabled:text-muted"
        >
          {busy ? "Saving…" : "Make admin"}
        </button>
      </form>
      {(error || loadError) && <p className="mt-2 text-sm text-chili">{error || loadError}</p>}
    </section>
  );
}

function SideButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-full px-4 text-sm font-semibold ${
        active ? "bg-primary text-white" : "border border-line bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function rosterIndex(roster: readonly string[], name: string): number {
  const index = roster.indexOf(name);
  return index < 0 ? 999 : index;
}
