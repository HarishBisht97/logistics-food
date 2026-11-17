import { describe, expect, it } from "vitest";
import { PLACEMENT_SIZE, TEAM_SIZE, resolveSide } from "./lib/constants";
import { buildCsv } from "./lib/csv";
import { todayKolkata, formatPlacedAt } from "./lib/dates";
import { assertCanMerge, mergeOrders, orderIdFor, splitLeave } from "./lib/group";
import { MENU, groupMenu } from "./lib/menu";
import {
  budgetAmount,
  formatPaise,
  limitPaise,
  limitStatus,
  mainTotalPaise,
  perPersonLimitPaise,
  spentTowardLimit,
} from "./lib/money";
import { canPlace, clearList, emptyOrder, placeOrder, setNote, setQty } from "./lib/orderState";
import {
  applyDeleteFieldPlan,
  applyOrderDiff,
  buildDeleteFieldPlan,
  deepMergeQty,
  diffOrder,
  replaceQty,
} from "./lib/orderWrite";
import { qtyAfterSnapshot, shouldApplyRemote } from "./lib/sync";
import type { OrderDraft, QtyMap, StoredOrder } from "./types";

function orderWith(items: QtyMap, extras: QtyMap = {}): OrderDraft {
  return { ...emptyOrder(["Abhay"]), items: { ...items }, extras: { ...extras } };
}

describe("menu", () => {
  it("keeps the shipped prices and file order", () => {
    expect(MENU).toHaveLength(220);
    expect(MENU[0]).toMatchObject({ id: 0, name: "Tomato Soup", price: 115.5, veg: true });
    expect(TEAM_SIZE).toBe(21);
    expect(PLACEMENT_SIZE).toBe(5);
    const cats: string[] = [];
    for (const item of MENU) {
      if (!cats.includes(item.cat)) cats.push(item.cat);
    }
    expect(groupMenu(MENU).map((group) => group.cat)).toEqual(cats);
  });
});

describe("money", () => {
  it("formats rupees the Indian way", () => {
    expect(formatPaise(123450)).toBe("₹1,234.50");
    expect(formatPaise(0)).toBe("₹0.00");
  });

  it("group limit is n times the per-person share", () => {
    expect(formatPaise(perPersonLimitPaise(6000))).toBe("₹285.71");
    expect(formatPaise(limitPaise(6000, 2))).toBe("₹571.43");
    expect(formatPaise(limitPaise(6000, 3))).toBe("₹857.14");
  });

  it("a changed budget updates the limit", () => {
    expect(formatPaise(limitPaise(budgetAmount(null), 1))).toBe("₹285.71");
    expect(formatPaise(limitPaise(budgetAmount(undefined), 1))).toBe("₹285.71");
    expect(formatPaise(limitPaise(budgetAmount(4200), 1))).toBe("₹200.00");
    expect(limitPaise(budgetAmount(4200), 1)).not.toBe(limitPaise(budgetAmount(null), 1));
  });

  it("uses each group's own headcount for the limit", () => {
    expect(limitPaise(6000, 1)).toBe(limitPaise(6000, 1, TEAM_SIZE));
    expect(formatPaise(limitPaise(6000, 1, PLACEMENT_SIZE))).toBe("₹1,200.00");
    expect(formatPaise(limitPaise(6000, 2, PLACEMENT_SIZE))).toBe("₹2,400.00");
    const cap = limitPaise(6000, 1, PLACEMENT_SIZE);
    expect(limitStatus(cap, cap)).toEqual({ kind: "under", leftPaise: 0 });
    expect(resolveSide(undefined, "Abhay")).toBe("apc");
    expect(resolveSide("placement", null)).toBe("placement");
    expect(resolveSide(undefined, null)).toBeNull();
  });

  it("treats spending the exact limit as under", () => {
    const cap = limitPaise(6000, 1);
    expect(limitStatus(cap, cap)).toEqual({ kind: "under", leftPaise: 0 });
    expect(limitStatus(cap + 1, cap).kind).toBe("over");
  });

  it("extras do not affect the limit", () => {
    const order = { ...emptyOrder(["Abhay"]), items: { a: 1 }, extras: { b: 9 } };
    const price = () => 100;
    const spent = spentTowardLimit(order, price);
    expect(spent).toBe(10_000);
    expect(mainTotalPaise(order.extras, price)).toBe(90_000);
    const cap = limitPaise(6000, 1);
    expect(limitStatus(spent, cap).kind).toBe("under");
    expect(limitStatus(spent + mainTotalPaise(order.extras, price), cap).kind).toBe("over");
  });
});

describe("drafts and placed orders", () => {
  it("removing an item to 0 stays removed after a reload", () => {
    const previous = { "1": 2, "2": 1 };
    const next = setQty(orderWith(previous), "items", "1", 0);

    const reloaded = replaceQty(next.items);
    expect(reloaded).toEqual({ "2": 1 });
    expect(reloaded["1"]).toBeUndefined();

    const deleted = applyDeleteFieldPlan(previous, buildDeleteFieldPlan(previous, next.items));
    expect(deleted["1"]).toBeUndefined();
    expect(deleted).toEqual({ "2": 1 });

    // setDoc(..., { merge: true }) keeps the old key. That path must not be used.
    expect(deepMergeQty(previous, next.items)["1"]).toBe(2);
  });

  it("Clear empties the list", () => {
    const previous = { "1": 2, "2": 1 };
    const cleared = clearList(orderWith(previous), "items");
    expect(cleared.items).toEqual({});
    expect(replaceQty(cleared.items)).toEqual({});
    expect(applyDeleteFieldPlan(previous, buildDeleteFieldPlan(previous, cleared.items))).toEqual({});
    expect(canPlace(cleared)).toBe(false);
  });

  it("Place order then an edit goes back to draft", () => {
    let order = setQty(emptyOrder(["Abhay"]), "items", "1", 1);
    order = placeOrder(order, 1_700_000_000_000);
    expect(order.placed).toBe(true);
    expect(order.placedAt).toBe(1_700_000_000_000);

    order = setQty(order, "items", "1", 2);
    expect(order.placed).toBe(false);
    expect(order.placedAt).toBeNull();

    order = placeOrder(order, 1_700_000_000_100);
    order = setNote(order, "no onion");
    expect(order.placed).toBe(false);
    expect(order.placedAt).toBeNull();

    order = placeOrder(order, 5);
    order = clearList(order, "items");
    expect(order.placed).toBe(false);
    expect(order.placedAt).toBeNull();
  });

  it("disables place when the order is empty", () => {
    expect(canPlace(emptyOrder(["Abhay"]))).toBe(false);
    expect(canPlace(setNote(emptyOrder(["Abhay"]), "   "))).toBe(false);
    expect(canPlace(setNote(emptyOrder(["Abhay"]), "tea"))).toBe(true);
  });
});

describe("sync and groups", () => {
  it("a late snapshot does not overwrite a newer local edit", () => {
    expect(shouldApplyRemote(4, 3)).toBe(false);
    expect(qtyAfterSnapshot(4, 3, 3, 1)).toBe(3);
    expect(qtyAfterSnapshot(4, 4, 3, 1)).toBe(1);
  });

  it("applies a removal onto the server without dropping a teammate's dish", () => {
    const base = { ...emptyOrder(["Abhay", "Jeet"]), items: { "1": 1 } };
    const local = setQty(base, "items", "1", 0);
    const server = { ...base, items: { "1": 1, "5": 2 } };
    expect(applyOrderDiff(server, diffOrder(base, local)).items).toEqual({ "5": 2 });
  });

  it("merges drafts and leaves an empty solo order", () => {
    expect(orderIdFor(["Jeet", "Abhay"])).toBe("Abhay_Jeet");
    expect(orderIdFor(["Abhay"])).toBe("Abhay");
    const merged = mergeOrders(
      [
        { ...emptyOrder(["Abhay"]), items: { "1": 1 }, extras: { "2": 1 }, note: "no onion" },
        { ...emptyOrder(["Jeet"]), items: { "1": 2, "3": 1 } },
      ],
      ["Jeet", "Abhay"],
    );
    expect(merged.items).toEqual({ "1": 3, "3": 1 });
    expect(merged.extras).toEqual({ "2": 1 });
    expect(merged.note).toBe("no onion");
    expect(merged.placed).toBe(false);
    expect(merged.members).toEqual(["Abhay", "Jeet"]);

    const split = splitLeave({ ...merged, placed: true, placedAt: 9 }, "Jeet");
    expect(split.leaver).toEqual(emptyOrder(["Jeet"]));
    expect(split.remaining.members).toEqual(["Abhay"]);
    expect(split.remaining.items).toEqual(merged.items);
    expect(split.remaining.placed).toBe(false);

    expect(() => assertCanMerge([{ ...emptyOrder(["Jeet", "Mihir"]) }], ["Abhay", "Jeet"])).toThrow(
      /Mihir/,
    );
  });
});

describe("dates and csv", () => {
  it("uses Asia/Kolkata for the default date and placed time", () => {
    expect(todayKolkata(new Date("2026-01-01T20:00:00Z"))).toBe("2026-01-02");
    expect(formatPlacedAt(Date.UTC(2026, 0, 1, 17, 1, 0))).toBe("10:31 PM");
  });

  it("exports placed orders only, with a UTF-8 BOM", () => {
    const placed: StoredOrder = {
      id: "Abhay",
      ...emptyOrder(["Abhay"]),
      items: { "0": 2 },
      extras: { "1": 1 },
      note: "no onion, extra rice",
      placed: true,
      placedAt: 1,
    };
    const draft: StoredOrder = {
      ...placed,
      id: "Jeet",
      members: ["Jeet"],
      placed: false,
      placedAt: null,
      note: "skip me",
    };
    const csv = buildCsv("2026-11-16", [placed, draft], 6000);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Date,Name/group,Group size,Type,Item,Qty,Unit price,Line total,Order total,Limit,Status");
    expect(csv).toContain("Tomato Soup");
    expect(csv).toContain('"no onion, extra rice"');
    expect(csv).not.toContain("skip me");
    expect(csv).not.toContain("Jeet");
  });
});
