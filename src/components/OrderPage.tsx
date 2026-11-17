import { useState } from "react";
import { Header } from "./Header";
import { GroupSection } from "./GroupSection";
import { MenuBrowser } from "./MenuBrowser";
import { OrderPanel } from "./OrderPanel";
import { todayKolkata } from "../lib/dates";
import { MENU } from "../lib/menu";
import { useBudget } from "../hooks/useBudget";
import { useDayOrders } from "../hooks/useDayOrders";
import type { OrderMode, VegFilter } from "../types";

export function OrderPage({
  email,
  name,
  onSignOut,
}: {
  email: string;
  name: string;
  onSignOut: () => void;
}) {
  const [date, setDate] = useState(todayKolkata);
  return (
    <div className="min-h-screen">
      <Header email={email} subtitle={name} onSignOut={onSignOut} />
      <DayOrder key={`${date}:${name}`} date={date} name={name} onDate={setDate} />
    </div>
  );
}

function DayOrder({ date, name, onDate }: { date: string; name: string; onDate: (date: string) => void }) {
  const budget = useBudget(date);
  const day = useDayOrders(date, name);
  const [mode, setMode] = useState<OrderMode>("main");
  const [query, setQuery] = useState("");
  const [veg, setVeg] = useState<VegFilter>("all");
  const list = mode === "main" ? "items" : "extras";
  const myMembers = day.myOrder.members.includes(name) ? day.myOrder.members : [name];
  const locked = !day.ready || day.groupBusy;

  return (
    <div className="mx-auto grid max-w-6xl items-start gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="space-y-4 pb-[calc(18rem+env(safe-area-inset-bottom))] lg:pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="order-date" className="text-sm font-semibold">
            Date
          </label>
          <input
            id="order-date"
            type="date"
            value={date}
            onChange={(event) => onDate(event.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-white px-3 text-base sm:w-52"
          />
        </div>
        {budget.error && <p className="text-sm text-chili">{budget.error}</p>}
        <GroupSection
          myName={name}
          myMembers={myMembers}
          orders={day.orders}
          pointers={day.pointers}
          busy={locked}
          error={day.groupError}
          onSave={(names) => void day.saveGroup(names)}
          onLeave={() => void day.leave()}
        />
        <MenuBrowser
          menu={MENU}
          mode={mode}
          query={query}
          veg={veg}
          disabled={locked}
          qtyOf={(id) => day.myOrder[list][id] ?? 0}
          onQuery={setQuery}
          onVeg={setVeg}
          onMode={setMode}
          onQty={(id, qty) => day.setItemQty(list, id, qty)}
        />
      </div>
      <OrderPanel
        order={day.myOrder}
        budget={budget.amount}
        ready={day.ready}
        busy={day.groupBusy}
        saveStatus={day.saveStatus}
        saveError={day.saveError}
        rewritten={day.rewritten}
        onQty={day.setItemQty}
        onClearMain={() => day.clear("items")}
        onNote={day.setNote}
        onPlace={day.place}
        onRetry={day.retry}
      />
    </div>
  );
}
