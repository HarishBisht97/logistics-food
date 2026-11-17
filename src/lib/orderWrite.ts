import type { OrderDraft, QtyMap } from "../types";

export type MapDiff = { set: QtyMap; del: string[] };

export type OrderDiff = {
  items: MapDiff;
  extras: MapDiff;
  note?: string;
  placed?: boolean;
  placedAt?: number | null;
};

/** Drops zero and negative quantities so a replaced map cannot resurrect them. */
export function compactQtyMap(map: QtyMap): QtyMap {
  const out: QtyMap = {};
  for (const [id, qty] of Object.entries(map)) {
    if (qty > 0) out[id] = qty;
  }
  return out;
}

/**
 * Firestore `setDoc(..., { merge: true })` deep-merges maps, so a key you
 * stopped sending is kept. That is the bug that brings deselected dishes back.
 */
export function deepMergeQty(previous: QtyMap, incoming: QtyMap): QtyMap {
  return { ...previous, ...compactQtyMap(incoming) };
}

/** Whole-map replace: `updateDoc({ items })` or `setDoc` without merge. */
export function replaceQty(incoming: QtyMap): QtyMap {
  return compactQtyMap(incoming);
}

export type DeleteStep = { id: string; qty: number | null };

/** `null` qty means `deleteField()` on that map key. */
export function buildDeleteFieldPlan(previous: QtyMap, next: QtyMap): DeleteStep[] {
  const compact = compactQtyMap(next);
  const ids = new Set([...Object.keys(previous), ...Object.keys(compact)]);
  const plan: DeleteStep[] = [];
  for (const id of ids) {
    if (!(id in compact)) plan.push({ id, qty: null });
    else if (previous[id] !== compact[id]) plan.push({ id, qty: compact[id] });
  }
  return plan;
}

export function applyDeleteFieldPlan(previous: QtyMap, plan: readonly DeleteStep[]): QtyMap {
  const out = { ...previous };
  for (const step of plan) {
    if (step.qty === null) delete out[step.id];
    else out[step.id] = step.qty;
  }
  return out;
}

export function replacementFields(order: OrderDraft): Omit<OrderDraft, never> {
  return {
    members: [...order.members],
    items: compactQtyMap(order.items),
    extras: compactQtyMap(order.extras),
    note: order.note,
    placed: order.placed,
    placedAt: order.placedAt,
  };
}

export function emptyOrderDiff(): OrderDiff {
  return { items: { set: {}, del: [] }, extras: { set: {}, del: [] } };
}

export function diffQtyMap(base: QtyMap, next: QtyMap): MapDiff {
  const compact = compactQtyMap(next);
  const set: QtyMap = {};
  const del: string[] = [];
  const ids = new Set([...Object.keys(base), ...Object.keys(compact)]);
  for (const id of ids) {
    const before = base[id] ?? 0;
    const after = compact[id] ?? 0;
    if (after <= 0 && before > 0) del.push(id);
    else if (after > 0 && after !== before) set[id] = after;
  }
  return { set, del };
}

export function diffOrder(base: OrderDraft, next: OrderDraft): OrderDiff {
  const diff: OrderDiff = {
    items: diffQtyMap(base.items, next.items),
    extras: diffQtyMap(base.extras, next.extras),
  };
  if (base.note !== next.note) diff.note = next.note;
  if (base.placed !== next.placed) diff.placed = next.placed;
  if (base.placedAt !== next.placedAt) diff.placedAt = next.placedAt;
  return diff;
}

export function isEmptyDiff(diff: OrderDiff): boolean {
  return (
    Object.keys(diff.items.set).length === 0 &&
    diff.items.del.length === 0 &&
    Object.keys(diff.extras.set).length === 0 &&
    diff.extras.del.length === 0 &&
    diff.note === undefined &&
    diff.placed === undefined &&
    diff.placedAt === undefined
  );
}

export function combineMapDiff(first: MapDiff, second: MapDiff): MapDiff {
  const set = { ...first.set };
  const del = new Set(first.del);
  for (const id of second.del) {
    del.add(id);
    delete set[id];
  }
  for (const [id, qty] of Object.entries(second.set)) {
    del.delete(id);
    set[id] = qty;
  }
  return { set, del: [...del] };
}

export function combineOrderDiff(first: OrderDiff, second: OrderDiff): OrderDiff {
  const combined: OrderDiff = {
    items: combineMapDiff(first.items, second.items),
    extras: combineMapDiff(first.extras, second.extras),
  };
  const note = second.note !== undefined ? second.note : first.note;
  const placed = second.placed !== undefined ? second.placed : first.placed;
  const placedAt = second.placedAt !== undefined ? second.placedAt : first.placedAt;
  if (note !== undefined) combined.note = note;
  if (placed !== undefined) combined.placed = placed;
  if (placedAt !== undefined) combined.placedAt = placedAt;
  return combined;
}

export function applyMapDiff(server: QtyMap, diff: MapDiff): QtyMap {
  const out = { ...server };
  for (const id of diff.del) delete out[id];
  for (const [id, qty] of Object.entries(diff.set)) {
    if (qty <= 0) delete out[id];
    else out[id] = qty;
  }
  return out;
}

/** Apply only this client's edits onto the latest server order. */
export function applyOrderDiff(server: OrderDraft, diff: OrderDiff): OrderDraft {
  return {
    members: [...server.members],
    items: applyMapDiff(server.items, diff.items),
    extras: applyMapDiff(server.extras, diff.extras),
    note: diff.note === undefined ? server.note : diff.note,
    placed: diff.placed === undefined ? server.placed : diff.placed,
    placedAt: diff.placedAt === undefined ? server.placedAt : diff.placedAt,
  };
}
