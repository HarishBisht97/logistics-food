import type { ListName, OrderDraft, QtyMap } from "../types";

export function emptyOrder(members: string[]): OrderDraft {
  return {
    members: [...members],
    items: {},
    extras: {},
    note: "",
    placed: false,
    placedAt: null,
  };
}

export function hasQty(map: QtyMap): boolean {
  return Object.values(map).some((qty) => qty > 0);
}

export function canPlace(order: OrderDraft): boolean {
  return hasQty(order.items) || hasQty(order.extras) || order.note.trim().length > 0;
}

function withMap(order: OrderDraft, list: ListName, map: QtyMap): OrderDraft {
  return { ...order, [list]: map, placed: false, placedAt: null };
}

export function setQty(order: OrderDraft, list: ListName, id: string, qty: number): OrderDraft {
  const next: QtyMap = { ...order[list] };
  if (qty <= 0) delete next[id];
  else next[id] = Math.min(99, Math.floor(qty));
  return withMap(order, list, next);
}

export function clearList(order: OrderDraft, list: ListName): OrderDraft {
  return withMap(order, list, {});
}

export function setNote(order: OrderDraft, note: string): OrderDraft {
  return { ...order, note, placed: false, placedAt: null };
}

export function placeOrder(order: OrderDraft, now: number): OrderDraft {
  return { ...order, placed: true, placedAt: now };
}
