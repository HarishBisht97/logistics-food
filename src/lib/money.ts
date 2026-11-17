import { DEFAULT_BUDGET, TEAM_SIZE } from "./constants";
import type { OrderDraft, QtyMap } from "../types";

export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Missing or invalid budget docs fall back to ₹6000. */
export function budgetAmount(stored: number | null | undefined): number {
  if (typeof stored !== "number" || !Number.isFinite(stored) || stored <= 0) {
    return DEFAULT_BUDGET;
  }
  return stored;
}

/**
 * Limit in paise for `members` people.
 * Rounded once on the full share so 2 × (6000/21) displays as ₹571.43,
 * while one person displays as ₹285.71.
 */
export function limitPaise(budgetRupees: number, members = 1, headcount: number = TEAM_SIZE): number {
  const count = members > 0 ? members : 1;
  const size = headcount > 0 ? headcount : 1;
  return Math.round((toPaise(budgetRupees) * count) / size);
}

export function perPersonLimitPaise(budgetRupees: number): number {
  return limitPaise(budgetRupees, 1);
}

export function formatPaise(paise: number): string {
  const negative = paise < 0;
  const abs = Math.abs(Math.round(paise));
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  const grouped = whole.toLocaleString("en-IN");
  return `${negative ? "-" : ""}₹${grouped}.${frac}`;
}

export function formatRupees(rupees: number): string {
  return formatPaise(toPaise(rupees));
}

export function mainTotalPaise(items: QtyMap, priceOf: (id: string) => number): number {
  let total = 0;
  for (const [id, qty] of Object.entries(items)) {
    if (qty > 0) total += toPaise(priceOf(id)) * qty;
  }
  return total;
}

/** Only the main order counts toward the personal or group limit. */
export function spentTowardLimit(order: Pick<OrderDraft, "items">, priceOf: (id: string) => number): number {
  return mainTotalPaise(order.items, priceOf);
}

export type LimitStatus =
  | { kind: "under"; leftPaise: number }
  | { kind: "over"; overPaise: number };

/** Equal to the limit counts as under (green). */
export function limitStatus(spentPaise: number, capPaise: number): LimitStatus {
  if (spentPaise <= capPaise) {
    return { kind: "under", leftPaise: capPaise - spentPaise };
  }
  return { kind: "over", overPaise: spentPaise - capPaise };
}

export function budgetLeftPaise(budgetRupees: number, placedMainPaise: number): number {
  return toPaise(budgetRupees) - placedMainPaise;
}

export function extrasFit(
  leftoverPaise: number,
  extrasPaise: number,
): { ok: true } | { ok: false; overPaise: number } {
  if (extrasPaise <= leftoverPaise) return { ok: true };
  return { ok: false, overPaise: extrasPaise - leftoverPaise };
}
