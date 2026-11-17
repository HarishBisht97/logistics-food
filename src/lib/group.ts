import { sortByTeam } from "./constants";
import { emptyOrder } from "./orderState";
import type { OrderDraft, QtyMap, StoredOrder } from "../types";

export function orderIdFor(members: readonly string[]): string {
  const unique = [...new Set(members.map((name) => name.trim()).filter(Boolean))];
  unique.sort((a, b) => a.localeCompare(b));
  if (unique.length <= 1) return unique[0] ?? "";
  return unique.join("_");
}

function addQty(target: QtyMap, extra: QtyMap) {
  for (const [id, qty] of Object.entries(extra)) {
    if (qty > 0) target[id] = (target[id] ?? 0) + qty;
  }
}

export function mergeOrders(parts: readonly OrderDraft[], members: readonly string[]): OrderDraft {
  const items: QtyMap = {};
  const extras: QtyMap = {};
  const notes: string[] = [];
  for (const part of parts) {
    addQty(items, part.items);
    addQty(extras, part.extras);
    const note = part.note.trim();
    if (note && !notes.includes(note)) notes.push(note);
  }
  return {
    members: sortByTeam(members),
    items,
    extras,
    note: notes.join("\n"),
    placed: false,
    placedAt: null,
  };
}

export function assertCanMerge(orders: readonly OrderDraft[], members: readonly string[]) {
  for (const order of orders) {
    for (const name of order.members) {
      if (!members.includes(name)) {
        throw new Error(`${name} is already in another group`);
      }
    }
  }
}

export function blockedNames(
  myName: string,
  myMembers: readonly string[],
  orders: readonly StoredOrder[],
  pointers: Readonly<Record<string, string>>,
): Set<string> {
  const blocked = new Set<string>();
  for (const [name, orderId] of Object.entries(pointers)) {
    if (!orderId || name === myName || myMembers.includes(name)) continue;
    const order = orders.find((entry) => entry.id === orderId);
    if (order && order.members.length > 1 && order.members.includes(name)) blocked.add(name);
  }
  return blocked;
}

/** Leaver gets an empty solo order. Everyone else keeps the group's items. */
export function splitLeave(order: OrderDraft, name: string): {
  remaining: OrderDraft;
  leaver: OrderDraft;
} {
  return {
    remaining: {
      ...order,
      members: order.members.filter((member) => member !== name),
      placed: false,
      placedAt: null,
    },
    leaver: emptyOrder([name]),
  };
}
