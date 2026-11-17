import { useState } from "react";
import { formatPlacedAt } from "../lib/dates";
import { menuItem } from "../lib/menu";
import { formatPaise, limitPaise, limitStatus, spentTowardLimit, toPaise } from "../lib/money";
import { canPlace } from "../lib/orderState";
import { QtyStepper } from "./QtyStepper";
import type { ListName, OrderDraft } from "../types";

export function OrderPanel({
  order,
  budget,
  ready,
  busy,
  saveStatus,
  saveError,
  rewritten,
  onQty,
  onClearMain,
  onNote,
  onPlace,
  onRetry,
}: {
  order: OrderDraft;
  budget: number;
  ready: boolean;
  busy: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
  rewritten: boolean;
  onQty: (list: ListName, id: string, qty: number) => void;
  onClearMain: () => void;
  onNote: (note: string) => void;
  onPlace: () => void;
  onRetry: () => void;
}) {
  const [open, setOpen] = useState(false);
  const people = Math.max(order.members.length, 1);
  const cap = limitPaise(budget, people);
  const spent = spentTowardLimit(order, (id) => menuItem(id)?.price ?? 0);
  const status = limitStatus(spent, cap);
  const over = status.kind === "over";
  const placed = order.placed && order.placedAt != null;
  const disabled = !ready || busy;

  return (
    <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-auto lg:rounded-3xl lg:border lg:shadow-card">
      <div className="mx-auto max-w-6xl space-y-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:max-w-none">
        <div className={`rounded-2xl border px-4 py-3 ${over ? "border-chili/30 bg-chili/10 text-chili" : "border-leaf/40 bg-leaf/10 text-leaf"}`}>
          <p className="font-mono text-lg font-medium leading-none">
            {formatPaise(spent)} / {formatPaise(cap)}
          </p>
          <p className="mt-1.5 font-mono text-sm leading-none">
            {status.kind === "over"
              ? `Over by ${formatPaise(status.overPaise)}`
              : `${formatPaise(status.leftPaise)} left`}
            {people > 1 ? ` · group of ${people}` : ""}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <p className={saveStatus === "error" ? "text-chili" : "text-muted"}>
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "error" && (saveError ?? "Could not save")}
            {!ready && saveStatus === "idle" && "Loading today’s order…"}
          </p>
          {saveStatus === "error" && (
            <button type="button" onClick={onRetry} className="font-semibold text-chili">
              Retry save
            </button>
          )}
        </div>

        <button
          type="button"
          className="min-h-11 text-left text-sm font-semibold text-primary lg:hidden"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Hide lists" : "Show lists"}
        </button>

        <div className={open ? "space-y-4" : "hidden space-y-4 lg:block"}>
          <section>
            <h2 className="font-semibold">Your main order</h2>
            <Lines
              map={order.items}
              disabled={disabled}
              onQty={(id, qty) => onQty("items", id, qty)}
              onRemove={(id) => onQty("items", id, 0)}
            />
            <button
              type="button"
              disabled={disabled || Object.keys(order.items).length === 0}
              onClick={onClearMain}
              className="mt-2 h-11 rounded-full border border-line px-4 text-sm disabled:opacity-40"
            >
              Clear main order
            </button>
          </section>

          <section>
            <h2 className="font-semibold">Your extra order</h2>
            <p className="text-xs text-muted">not counted in your limit</p>
            <Lines
              map={order.extras}
              disabled={disabled}
              onQty={(id, qty) => onQty("extras", id, qty)}
              onRemove={(id) => onQty("extras", id, 0)}
            />
            <label className="mt-3 block text-sm font-medium">
              Anything else? (type it)
              <textarea
                value={order.note}
                disabled={disabled}
                onChange={(event) => onNote(event.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-base font-normal outline-none focus:border-primary"
              />
            </label>
          </section>
        </div>

        <button
          type="button"
          disabled={placed || disabled || !canPlace(order)}
          onClick={onPlace}
          className={`h-14 w-full rounded-2xl text-lg font-semibold ${
            placed ? "bg-leaf text-on-leaf" : "bg-primary text-white disabled:bg-fill disabled:text-muted"
          }`}
        >
          {placed && order.placedAt ? `✓ Order placed at ${formatPlacedAt(order.placedAt)}` : "Place order"}
        </button>
        {rewritten && !order.placed && (
          <p className="text-center text-sm font-medium text-chili">Not placed yet — press Place order again</p>
        )}
      </div>
    </aside>
  );
}

function Lines({
  map,
  disabled,
  onQty,
  onRemove,
}: {
  map: Record<string, number>;
  disabled: boolean;
  onQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  const ids = Object.keys(map)
    .filter((id) => map[id] > 0)
    .sort((a, b) => Number(a) - Number(b));
  if (ids.length === 0) return <p className="mt-2 text-sm text-muted">Nothing yet.</p>;
  return (
    <ul className="mt-2 space-y-3">
      {ids.map((id) => {
        const item = menuItem(id);
        const name = item?.name ?? `Item ${id}`;
        const line = toPaise(item?.price ?? 0) * map[id];
        return (
          <li key={id} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="font-mono text-xs text-muted">{formatPaise(line)}</p>
            </div>
            <QtyStepper qty={map[id]} label={name} disabled={disabled} onChange={(qty) => onQty(id, qty)} />
            <button
              type="button"
              aria-label={`Remove ${name}`}
              disabled={disabled}
              onClick={() => onRemove(id)}
              className="grid h-11 w-11 place-items-center text-xl text-chili disabled:opacity-40"
            >
              ✕
            </button>
          </li>
        );
      })}
    </ul>
  );
}
