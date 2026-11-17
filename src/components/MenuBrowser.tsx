import { formatRupees } from "../lib/money";
import { filterMenu, groupMenu } from "../lib/menu";
import { QtyStepper } from "./QtyStepper";
import type { MenuItem, OrderMode, VegFilter } from "../types";

export function MenuBrowser({
  menu,
  mode,
  qtyOf,
  disabled,
  query,
  veg,
  onQuery,
  onVeg,
  onMode,
  onQty,
}: {
  menu: readonly MenuItem[];
  mode: OrderMode;
  qtyOf: (id: string) => number;
  disabled: boolean;
  query: string;
  veg: VegFilter;
  onQuery: (value: string) => void;
  onVeg: (value: VegFilter) => void;
  onMode: (mode: OrderMode) => void;
  onQty: (id: string, qty: number) => void;
}) {
  const filtered = filterMenu(menu, query, veg);
  const groups = groupMenu(filtered);
  const filters: { id: VegFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "veg", label: "Veg" },
    { id: "nonveg", label: "Non-veg" },
  ];

  return (
    <section>
      <div className="grid grid-cols-1 items-stretch gap-2 min-[420px]:grid-cols-2">
        <button
          type="button"
          aria-pressed={mode === "main"}
          onClick={() => onMode("main")}
          className={`flex min-h-12 items-center justify-center rounded-2xl px-3 text-center text-sm font-semibold leading-snug ${
            mode === "main" ? "bg-primary text-white" : "border border-line bg-white text-ink"
          }`}
        >
          Main order
        </button>
        <button
          type="button"
          aria-pressed={mode === "extra"}
          onClick={() => onMode("extra")}
          className={`flex min-h-12 items-center justify-center rounded-2xl px-3 text-center text-sm font-semibold leading-snug ${
            mode === "extra" ? "bg-extra text-ink" : "border border-line bg-white text-ink"
          }`}
        >
          Extra order (only if budget is left)
        </button>
      </div>

      <div className={mode === "extra" ? "mt-3 rounded-3xl border-2 border-dashed border-extra p-3" : "mt-3"}>
        <label className="block">
          <span className="sr-only">Search dishes</span>
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search dishes"
            className="h-12 w-full rounded-xl border border-line bg-white px-4 text-base outline-none focus:border-primary"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={veg === filter.id}
              onClick={() => onVeg(filter.id)}
              className={`h-11 rounded-full px-4 text-sm font-semibold ${
                veg === filter.id ? "bg-primary text-white" : "border border-line bg-white"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {groups.length === 0 && <p className="mt-6 text-sm text-muted">No dishes match.</p>}

        <div className="mt-4 space-y-6">
          {groups.map((group) => (
            <section key={group.cat} className="rounded-2xl border border-line bg-white p-3 shadow-card sm:p-4">
              <h2 className="text-lg font-semibold">{group.cat}</h2>
              {group.subs.map((sub) => (
                <div key={sub.sub} className="mt-3">
                  {sub.sub && <h3 className="text-sm font-medium text-muted">{sub.sub}</h3>}
                  <ul className="mt-1">
                    {sub.items.map((item) => (
                      <MenuRow
                        key={item.id}
                        item={item}
                        qty={qtyOf(String(item.id))}
                        disabled={disabled}
                        onQty={(qty) => onQty(String(item.id), qty)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

function DietMark({ veg }: { veg: boolean }) {
  return (
    <span
      className={`mr-2 inline-grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] border ${
        veg ? "border-leaf" : "border-chili"
      }`}
      aria-hidden
    >
      <span className={`h-1.5 w-1.5 rounded-full ${veg ? "bg-leaf" : "bg-chili"}`} />
    </span>
  );
}

function MenuRow({
  item,
  qty,
  disabled,
  onQty,
}: {
  item: MenuItem;
  qty: number;
  disabled: boolean;
  onQty: (qty: number) => void;
}) {
  return (
    <li className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="flex items-center font-medium leading-5">
          <DietMark veg={item.veg} />
          <span className="min-w-0">{item.name}</span>
          <span className="sr-only">{item.veg ? ", vegetarian" : ", non-vegetarian"}</span>
        </p>
        <p className="mt-0.5 font-mono text-xs text-muted">{formatRupees(item.price)}</p>
      </div>
      <QtyStepper qty={qty} label={item.name} disabled={disabled} onChange={onQty} />
    </li>
  );
}
