import { useEffect, useMemo, useState } from "react";
import { Header } from "./Header";
import { getDb } from "../firebase";
import { useBudget } from "../hooks/useBudget";
import { useClaims, useUsers } from "../hooks/useDirectory";
import { useDayFeed } from "../hooks/useDayOrders";
import { TEAM, TEAM_SIZE, sortByTeam } from "../lib/constants";
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
  return (
    <div className="min-h-screen">
      <Header email={email} subtitle="Admin" onSignOut={onSignOut} />
      <AdminDay key={date} date={date} onDate={setDate} />
    </div>
  );
}

function AdminDay({ date, onDate }: { date: string; onDate: (date: string) => void }) {
  const budget = useBudget(date);
  const feed = useDayFeed(date);
  const { claims } = useClaims();
  const { users } = useUsers();
  const [draft, setDraft] = useState("");
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [budgetError, setBudgetError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(String(budget.amount));
  }, [budget.amount, date]);

  const live = useMemo(() => liveOrders(feed.orders, feed.pointers), [feed.orders, feed.pointers]);
  const rows = useMemo(() => {
    return [...live].sort((a, b) => teamIndex(sortByTeam(a.members)[0] ?? "") - teamIndex(sortByTeam(b.members)[0] ?? ""));
  }, [live]);
  const covered = new Set(live.flatMap((order) => order.members));
  const missing = TEAM.filter((name) => !covered.has(name));
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
      await releaseName(getDb(), name, uid);
    } catch (err) {
      setReleaseError(messageOf(err));
    }
  }

  function download() {
    const csv = buildCsv(date, live, budget.amount);
    downloadCsv(`ipt-apc-food-${date}.csv`, csv);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-4">
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
          Per person {formatPaise(limitPaise(budget.amount, 1))}
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
        <Card label="People who placed" value={`${placedPeopleCount(live)} / ${TEAM_SIZE}`} />
        <Card label="Orders over limit" value={String(ordersOverLimit(live, budget.amount))} />
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
                <OrderRow key={order.id} order={order} budget={budget.amount} />
              ))}
              {missing.map((name) => (
                <tr key={name} className="border-t align-top">
                  <td className="px-3 py-3">
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-muted">1 person · limit {formatPaise(limitPaise(budget.amount, 1))}</div>
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
                  <td className="px-3 py-3">{sortByTeam(order.members).join(", ")}</td>
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
          {TEAM.map((name) => {
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
        {TEAM.every((name) => !claims[name] && !users.some((user) => user.name === name)) && (
          <p className="mt-2 text-sm text-muted">No names claimed yet.</p>
        )}
        {releaseError && <p className="mt-2 text-sm text-chili">{releaseError}</p>}
      </section>
    </main>
  );
}

function OrderRow({ order, budget }: { order: StoredOrder; budget: number }) {
  const names = sortByTeam(order.members).join(", ");
  const size = order.members.length;
  const status = orderStatus(order, budget, priceOf);
  const total = Object.entries(order.items).reduce((sum, [id, qty]) => sum + toPaise(priceOf(id)) * qty, 0);
  return (
    <tr className="border-t align-top">
      <td className="px-3 py-3">
        <div className="font-medium">{names}</div>
        <div className="text-xs text-muted">
          {size === 1 ? "1 person" : `${size} people`} · limit {formatPaise(limitPaise(budget, size))}
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

function teamIndex(name: string): number {
  const index = TEAM.findIndex((item) => item === name);
  return index < 0 ? 999 : index;
}
