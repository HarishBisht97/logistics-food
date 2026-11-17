import { useMemo, useState } from "react";
import { blockedNames } from "../lib/group";
import { TEAM } from "../lib/constants";
import type { StoredOrder } from "../types";

export function GroupSection({
  myName,
  myMembers,
  orders,
  pointers,
  busy,
  error,
  onSave,
  onLeave,
}: {
  myName: string;
  myMembers: string[];
  orders: StoredOrder[];
  pointers: Record<string, string>;
  busy: boolean;
  error: string | null;
  onSave: (names: string[]) => void;
  onLeave: () => void;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const blocked = useMemo(
    () => blockedNames(myName, myMembers, orders, pointers),
    [myName, myMembers, orders, pointers],
  );
  const inGroup = myMembers.length > 1;
  const additions = checked.filter((name) => !myMembers.includes(name) && !blocked.has(name));

  function toggle(name: string) {
    setChecked((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    );
  }

  return (
    <details className="rounded-2xl border border-line bg-white shadow-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-sm font-semibold">
        Ordering with friends? Click here
      </summary>
      <div className="space-y-3 px-4 pb-4">
        {inGroup && (
          <p className="text-sm text-muted">
            You’re in a group with {myMembers.filter((name) => name !== myName).join(", ")}. You share one order.
          </p>
        )}
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3">
          {TEAM.filter((name) => name !== myName).map((name) => {
            const already = myMembers.includes(name);
            const unavailable = blocked.has(name);
            return (
              <label
                key={name}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-2 ${unavailable ? "text-muted" : ""}`}
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-primary"
                  checked={already || checked.includes(name)}
                  disabled={already || unavailable || busy}
                  onChange={() => toggle(name)}
                />
                <span>
                  {name}
                  {unavailable && <span className="ml-2 text-xs">in a group</span>}
                </span>
              </label>
            );
          })}
        </div>
        {error && <p className="text-sm text-chili">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || additions.length === 0}
            onClick={() => onSave([...new Set([...myMembers, ...additions])])}
            className="h-11 rounded-full bg-primary px-4 text-sm font-semibold text-white disabled:bg-fill disabled:text-muted"
          >
            {busy ? "Saving…" : "Save group"}
          </button>
          {inGroup && (
            <button
              type="button"
              disabled={busy}
              onClick={onLeave}
              className="h-11 rounded-full border border-chili px-4 text-sm font-semibold text-chili disabled:opacity-40"
            >
              Leave group
            </button>
          )}
        </div>
      </div>
    </details>
  );
}
