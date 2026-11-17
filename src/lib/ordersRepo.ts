import {
  deleteField,
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Firestore,
} from "firebase/firestore";
import { isTeamName } from "./constants";
import { messageOf } from "./errors";
import { assertCanMerge, mergeOrders, orderIdFor, splitLeave } from "./group";
import { emptyOrder } from "./orderState";
import { applyOrderDiff, replacementFields, type OrderDiff } from "./orderWrite";
import { parseOrder } from "./parse";
import type { OrderDraft } from "../types";

function payload(order: OrderDraft): DocumentData {
  return { ...replacementFields(order), updatedAt: serverTimestamp() };
}

function draftFrom(order: OrderDraft): OrderDraft {
  return {
    members: [...order.members],
    items: { ...order.items },
    extras: { ...order.extras },
    note: order.note,
    placed: order.placed,
    placedAt: order.placedAt,
  };
}

/**
 * Writes the whole items/extras maps (no merge). Merge would keep removed keys
 * and deselected dishes would come back after a reload.
 * The diff is applied inside the transaction onto the latest server doc.
 */
export async function saveOrderDiff(
  db: Firestore,
  date: string,
  myName: string,
  diff: OrderDiff,
): Promise<OrderDraft> {
  try {
    return await runTransaction(db, async (tx) => {
      const memberRef = doc(db, "days", date, "members", myName);
      const memberSnap = await tx.get(memberRef);
      const pointed = memberSnap.exists() ? memberSnap.data().orderId : null;
      let orderId = typeof pointed === "string" && pointed ? pointed : myName;
      let orderRef = doc(db, "days", date, "orders", orderId);
      let orderSnap = await tx.get(orderRef);

      const current = orderSnap.exists() ? parseOrder(orderSnap.id, orderSnap.data() ?? {}) : null;
      if (!current || !current.members.includes(myName)) {
        if (orderId !== myName) {
          orderId = myName;
          orderRef = doc(db, "days", date, "orders", orderId);
          orderSnap = await tx.get(orderRef);
        }
      }

      const server = orderSnap.exists()
        ? draftFrom(parseOrder(orderSnap.id, orderSnap.data() ?? {}))
        : emptyOrder([myName]);
      if (!server.members.includes(myName)) server.members = [myName];

      const merged = applyOrderDiff(server, diff);
      merged.members = [...server.members];

      if (orderSnap.exists()) tx.update(orderRef, payload(merged));
      else tx.set(orderRef, payload(merged));

      if (!memberSnap.exists() || memberSnap.data().orderId !== orderId) {
        tx.set(memberRef, { orderId });
      }
      return draftFrom(merged);
    });
  } catch (err) {
    throw new Error(messageOf(err));
  }
}

export async function formGroup(
  db: Firestore,
  date: string,
  myName: string,
  selected: readonly string[],
): Promise<OrderDraft> {
  const members = [...new Set([myName, ...selected].map((name) => name.trim()).filter(Boolean))];
  if (members.length < 2) throw new Error("Pick at least one friend");
  const newId = orderIdFor(members);

  try {
    return await runTransaction(db, async (tx) => {
      const memberSnaps = [];
      for (const name of members) {
        memberSnaps.push(await tx.get(doc(db, "days", date, "members", name)));
      }
      const orderIds = new Set<string>();
      for (const snap of memberSnaps) {
        const orderId = snap.exists() ? snap.data().orderId : null;
        if (typeof orderId === "string" && orderId) orderIds.add(orderId);
      }
      const orderSnaps = [];
      for (const id of orderIds) {
        orderSnaps.push(await tx.get(doc(db, "days", date, "orders", id)));
      }
      const newRef = doc(db, "days", date, "orders", newId);
      if (!orderIds.has(newId)) await tx.get(newRef);

      const collected: OrderDraft[] = [];
      for (const snap of orderSnaps) {
        if (!snap.exists()) continue;
        collected.push(draftFrom(parseOrder(snap.id, snap.data() ?? {})));
      }
      assertCanMerge(collected, members);
      const merged = mergeOrders(collected, members);
      tx.set(newRef, payload(merged));
      for (const id of orderIds) {
        if (id !== newId) tx.delete(doc(db, "days", date, "orders", id));
      }
      for (const name of members) {
        tx.set(doc(db, "days", date, "members", name), { orderId: newId });
      }
      return draftFrom(merged);
    });
  } catch (err) {
    throw new Error(messageOf(err));
  }
}

export async function leaveGroup(db: Firestore, date: string, myName: string): Promise<void> {
  try {
    await runTransaction(db, async (tx) => {
      const memberRef = doc(db, "days", date, "members", myName);
      const memberSnap = await tx.get(memberRef);
      if (!memberSnap.exists()) return;
      const oldId = memberSnap.data().orderId;
      if (typeof oldId !== "string" || !oldId) return;
      const oldRef = doc(db, "days", date, "orders", oldId);
      const oldSnap = await tx.get(oldRef);
      if (!oldSnap.exists()) return;
      const old = draftFrom(parseOrder(oldSnap.id, oldSnap.data() ?? {}));
      if (!old.members.includes(myName) || old.members.length < 2) return;
      if (oldId === myName) throw new Error("This order can't be split. Ask the admin.");

      const soloRef = doc(db, "days", date, "orders", myName);
      await tx.get(soloRef);
      const { remaining, leaver } = splitLeave(old, myName);
      tx.update(oldRef, {
        members: remaining.members,
        placed: false,
        placedAt: null,
        updatedAt: serverTimestamp(),
      });
      tx.set(soloRef, payload(leaver));
      tx.set(memberRef, { orderId: myName });
    });
  } catch (err) {
    throw new Error(messageOf(err));
  }
}

export async function claimName(db: Firestore, uid: string, email: string, name: string): Promise<void> {
  if (!isTeamName(name)) throw new Error("Pick a name from the team list");
  try {
    await runTransaction(db, async (tx) => {
      const claimRef = doc(db, "claims", name);
      const userRef = doc(db, "users", uid);
      const claim = await tx.get(claimRef);
      const user = await tx.get(userRef);
      if (claim.exists() && claim.data().uid !== uid) throw new Error("That name is already taken");
      const existing = user.exists() ? user.data().name : null;
      if (typeof existing === "string" && existing.length > 0) {
        throw new Error("You already picked a name");
      }
      if (!claim.exists()) tx.set(claimRef, { uid });
      tx.set(userRef, { email, name });
    });
  } catch (err) {
    throw new Error(messageOf(err));
  }
}

export async function releaseName(db: Firestore, name: string, uid: string | null): Promise<void> {
  try {
    await runTransaction(db, async (tx) => {
      const claimRef = doc(db, "claims", name);
      const claim = await tx.get(claimRef);
      const userSnap = uid ? await tx.get(doc(db, "users", uid)) : null;
      if (claim.exists()) tx.delete(claimRef);
      if (uid && userSnap?.exists()) tx.update(doc(db, "users", uid), { name: deleteField() });
    });
  } catch (err) {
    throw new Error(messageOf(err));
  }
}

export async function saveBudget(db: Firestore, date: string, amount: number): Promise<void> {
  try {
    await setDoc(doc(db, "budgets", date), { amount });
  } catch (err) {
    throw new Error(messageOf(err));
  }
}
