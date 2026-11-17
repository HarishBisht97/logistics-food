import { TEAM, TEAM_SIZE } from "./constants";
import { menuItem, priceOf } from "./menu";
import {
  budgetLeftPaise,
  extrasFit,
  formatPaise,
  limitPaise,
  limitStatus,
  mainTotalPaise,
} from "./money";
import type { MenuItem, OrderDraft, QtyMap, StoredOrder } from "../types";

const TEAM_LIST: readonly string[] = TEAM;

export function liveOrders(
  orders: readonly StoredOrder[],
  pointers: Readonly<Record<string, string>>,
): StoredOrder[] {
  const ids = new Set(Object.values(pointers).filter(Boolean));
  if (ids.size === 0) return [];
  return orders.filter((order) => ids.has(order.id));
}

export function placedMainPaise(orders: readonly StoredOrder[]): number {
  let total = 0;
  for (const order of orders) {
    if (order.placed) total += mainTotalPaise(order.items, priceOf);
  }
  return total;
}

export function placedExtraPaise(orders: readonly StoredOrder[]): number {
  let total = 0;
  for (const order of orders) {
    if (order.placed) total += mainTotalPaise(order.extras, priceOf);
  }
  return total;
}

export function placedPeopleCount(
  orders: readonly StoredOrder[],
  roster: readonly string[] = TEAM_LIST,
): number {
  const names = new Set<string>();
  for (const order of orders) {
    if (!order.placed) continue;
    for (const name of order.members) {
      if (roster.includes(name)) names.add(name);
    }
  }
  return names.size;
}

export function ordersOverLimit(
  orders: readonly StoredOrder[],
  budget: number,
  headcount: number = TEAM_SIZE,
): number {
  let count = 0;
  for (const order of orders) {
    if (!order.placed) continue;
    const spent = mainTotalPaise(order.items, priceOf);
    const cap = limitPaise(budget, order.members.length, headcount);
    if (limitStatus(spent, cap).kind === "over") count += 1;
  }
  return count;
}

export type StatusTone = "green" | "red" | "grey";

export function orderStatus(
  order: OrderDraft | null,
  budget: number,
  price: (id: string) => number,
  headcount: number = TEAM_SIZE,
): { label: string; tone: StatusTone } {
  const empty =
    !order ||
    (!order.placed &&
      !Object.values(order.items).some((qty) => qty > 0) &&
      !Object.values(order.extras).some((qty) => qty > 0) &&
      order.note.trim().length === 0);
  if (empty) return { label: "no order", tone: "grey" };
  if (!order.placed) return { label: "selecting… not placed", tone: "grey" };
  const spent = mainTotalPaise(order.items, price);
  const cap = limitPaise(budget, Math.max(order.members.length, 1), headcount);
  const status = limitStatus(spent, cap);
  if (status.kind === "under") {
    return { label: `${formatPaise(status.leftPaise)} left`, tone: "green" };
  }
  return { label: `+${formatPaise(status.overPaise)} over`, tone: "red" };
}

export function kitchenLines(orders: readonly StoredOrder[], menu: readonly MenuItem[]) {
  const qty = new Map<string, number>();
  for (const order of orders) {
    if (!order.placed) continue;
    for (const [id, count] of Object.entries(order.items)) {
      if (count > 0) qty.set(id, (qty.get(id) ?? 0) + count);
    }
  }
  return menu
    .filter((item) => (qty.get(String(item.id)) ?? 0) > 0)
    .map((item) => ({ item, qty: qty.get(String(item.id)) ?? 0 }));
}

export function describeItems(map: QtyMap): string {
  const parts = Object.entries(map)
    .filter(([, qty]) => qty > 0)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([id, qty]) => `${qty} × ${menuItem(id)?.name ?? `Item ${id}`}`);
  return parts.join(", ");
}

export function extrasHeadline(budget: number, mainPaise: number, extraPaise: number) {
  const left = budgetLeftPaise(budget, mainPaise);
  const fit = extrasFit(left, extraPaise);
  return { left, extraPaise, fit };
}
