import type { DocumentData } from "firebase/firestore";
import type { QtyMap, StoredOrder } from "../types";

export function parseQty(raw: unknown): QtyMap {
  if (!raw || typeof raw !== "object") return {};
  const out: QtyMap = {};
  for (const [id, qty] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof qty === "number" && Number.isFinite(qty) && qty > 0) out[id] = qty;
  }
  return out;
}

export function parseOrder(id: string, data: DocumentData): StoredOrder {
  const members = Array.isArray(data.members)
    ? data.members.filter((member): member is string => typeof member === "string")
    : [];
  return {
    id,
    members,
    items: parseQty(data.items),
    extras: parseQty(data.extras),
    note: typeof data.note === "string" ? data.note : "",
    placed: data.placed === true,
    placedAt: typeof data.placedAt === "number" ? data.placedAt : null,
  };
}
