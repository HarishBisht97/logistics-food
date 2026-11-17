import { emptyOrder } from "./orderState";
import type { OrderDraft, StoredOrder } from "../types";

/** Ignore a snapshot while this client has edits the server has not acked. */
export function shouldApplyRemote(localSeq: number, ackedSeq: number): boolean {
  return localSeq === ackedSeq;
}

export function qtyAfterSnapshot(
  localSeq: number,
  ackedSeq: number,
  localQty: number,
  remoteQty: number,
): number {
  if (!shouldApplyRemote(localSeq, ackedSeq)) return localQty;
  return remoteQty;
}

function strip(order: StoredOrder): OrderDraft {
  return {
    members: [...order.members],
    items: { ...order.items },
    extras: { ...order.extras },
    note: order.note,
    placed: order.placed,
    placedAt: order.placedAt,
  };
}

/** Pointer wins. Null means the pointer is known but that order doc is not in this snapshot yet. */
export function resolveMine(
  orders: readonly StoredOrder[],
  pointers: Readonly<Record<string, string>>,
  myName: string,
): OrderDraft | null {
  const pointed = pointers[myName];
  if (pointed) {
    const found = orders.find((order) => order.id === pointed && order.members.includes(myName));
    if (found) return strip(found);
    return null;
  }
  const fallback = orders.find((order) => order.members.includes(myName));
  if (fallback) return strip(fallback);
  return emptyOrder([myName]);
}
