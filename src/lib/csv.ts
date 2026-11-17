import { TEAM, TEAM_SIZE, sortByRoster } from "./constants";
import { menuItem, priceOf } from "./menu";
import { formatPaise, limitPaise, mainTotalPaise, toPaise } from "./money";
import { orderStatus } from "./status";
import type { StoredOrder } from "../types";

function cell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function buildCsv(
  date: string,
  orders: readonly StoredOrder[],
  budget: number,
  headcount: number = TEAM_SIZE,
  roster: readonly string[] = TEAM,
): string {
  const header = [
    "Date",
    "Name/group",
    "Group size",
    "Type",
    "Item",
    "Qty",
    "Unit price",
    "Line total",
    "Order total",
    "Limit",
    "Status",
  ];
  const lines = [header.join(",")];

  for (const order of orders) {
    if (!order.placed) continue;
    const names = sortByRoster(order.members, roster).join(", ");
    const size = order.members.length;
    const limit = formatPaise(limitPaise(budget, size, headcount));
    const status = orderStatus(order, budget, priceOf, headcount).label;
    const mainTotal = formatPaise(mainTotalPaise(order.items, priceOf));
    const extraTotal = formatPaise(mainTotalPaise(order.extras, priceOf));

    const push = (
      type: string,
      item: string,
      qty: string | number,
      unit: string,
      line: string,
      orderTotal: string,
    ) => {
      lines.push(
        [date, names, size, type, item, qty, unit, line, orderTotal, limit, status].map(cell).join(","),
      );
    };

    const ids = (map: typeof order.items) =>
      Object.keys(map).sort((a, b) => Number(a) - Number(b));

    for (const id of ids(order.items)) {
      const qty = order.items[id];
      const unit = toPaise(priceOf(id));
      push("Main", menuItem(id)?.name ?? `Item ${id}`, qty, formatPaise(unit), formatPaise(unit * qty), mainTotal);
    }
    for (const id of ids(order.extras)) {
      const qty = order.extras[id];
      const unit = toPaise(priceOf(id));
      push("Extra", menuItem(id)?.name ?? `Item ${id}`, qty, formatPaise(unit), formatPaise(unit * qty), extraTotal);
    }
    if (order.note.trim()) {
      push("Note", order.note.trim(), "", "", "", "");
    }
  }

  return `\uFEFF${lines.join("\n")}\n`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
