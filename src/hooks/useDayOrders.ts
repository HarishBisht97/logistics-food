import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { getDb } from "../firebase";
import { daysCollection, SAVE_DEBOUNCE_MS, type Side } from "../lib/constants";
import { messageOf } from "../lib/errors";
import { formGroup, leaveGroup, saveOrderDiff } from "../lib/ordersRepo";
import { canPlace, emptyOrder, placeOrder, setNote, setQty, clearList } from "../lib/orderState";
import {
  applyOrderDiff,
  combineOrderDiff,
  diffOrder,
  isEmptyDiff,
  type OrderDiff,
} from "../lib/orderWrite";
import { parseOrder } from "../lib/parse";
import { resolveMine, shouldApplyRemote } from "../lib/sync";
import type { ListName, OrderDraft, StoredOrder } from "../types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type Pending = { diff: OrderDiff; date: string; name: string; side: Side };

function sameMembers(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false;
  const names = new Set(left);
  return right.every((name) => names.has(name));
}

function cloneDraft(order: OrderDraft): OrderDraft {
  return {
    members: [...order.members],
    items: { ...order.items },
    extras: { ...order.extras },
    note: order.note,
    placed: order.placed,
    placedAt: order.placedAt,
  };
}

export function useDayFeed(date: string, side: Side) {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [pointers, setPointers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const db = getDb();
    const unsubOrders = onSnapshot(
      collection(db, daysCollection(side), date, "orders"),
      (snap) => {
        setOrders(snap.docs.map((item) => parseOrder(item.id, item.data())));
        setReady(true);
      },
      (err) => {
        setError(messageOf(err));
        setReady(true);
      },
    );
    const unsubMembers = onSnapshot(
      collection(db, daysCollection(side), date, "members"),
      (snap) => {
        const next: Record<string, string> = {};
        snap.forEach((item) => {
          next[item.id] = String(item.data().orderId ?? "");
        });
        setPointers(next);
      },
      (err) => setError(messageOf(err)),
    );
    return () => {
      unsubOrders();
      unsubMembers();
    };
  }, [date, side]);

  return { orders, pointers, error, ready };
}

export function useDayOrders(date: string, myName: string, side: Side) {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [pointers, setPointers] = useState<Record<string, string>>({});
  const [myOrder, setMyOrder] = useState<OrderDraft>(() => emptyOrder([myName]));
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rewritten, setRewritten] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupBusy, setGroupBusy] = useState(false);

  const ordersRef = useRef<StoredOrder[]>([]);
  const pointersRef = useRef<Record<string, string>>({});
  const draftRef = useRef<OrderDraft>(emptyOrder([myName]));
  const pendingRef = useRef<Pending | null>(null);
  const localSeq = useRef(0);
  const ackedSeq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseRemote = useRef(false);
  const dateRef = useRef(date);
  const nameRef = useRef(myName);
  const sideRef = useRef(side);
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);
  dateRef.current = date;
  nameRef.current = myName;
  sideRef.current = side;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function applyIfClean() {
    if (pauseRemote.current) return;
    if (!shouldApplyRemote(localSeq.current, ackedSeq.current)) return;
    const next = resolveMine(ordersRef.current, pointersRef.current, nameRef.current);
    if (!next) return;
    draftRef.current = next;
    setMyOrder(next);
    setRewritten((flag) => (next.placed ? false : flag));
  }

  async function writePending(taken: Pending | null): Promise<void> {
    if (!taken) return;
    try {
      const merged = await saveOrderDiff(getDb(), taken.side, taken.date, taken.name, taken.diff);
      if (!mountedRef.current || dateRef.current !== taken.date || nameRef.current !== taken.name) return;
      const newer = pendingRef.current;
      if (newer && newer.date === taken.date && newer.name === taken.name) {
        const replayed = cloneDraft(applyOrderDiff(merged, newer.diff));
        draftRef.current = replayed;
        setMyOrder(replayed);
        return;
      }
      const clean = cloneDraft(merged);
      draftRef.current = clean;
      setMyOrder(clean);
      ackedSeq.current = localSeq.current;
      setSaveStatus("saved");
      setSaveError(null);
    } catch (err) {
      if (!mountedRef.current || dateRef.current !== taken.date || nameRef.current !== taken.name) return;
      const newer = pendingRef.current;
      if (newer && newer.date === taken.date && newer.name === taken.name) {
        pendingRef.current = {
          diff: combineOrderDiff(taken.diff, newer.diff),
          date: taken.date,
          name: taken.name,
          side: taken.side,
        };
      } else {
        pendingRef.current = taken;
      }
      setSaveStatus("error");
      setSaveError(messageOf(err));
      throw err;
    }
  }

  function takePending(): Pending | null {
    const pending = pendingRef.current;
    if (!pending || isEmptyDiff(pending.diff)) {
      pendingRef.current = null;
      return null;
    }
    pendingRef.current = null;
    return {
      diff: {
        items: { set: { ...pending.diff.items.set }, del: [...pending.diff.items.del] },
        extras: { set: { ...pending.diff.extras.set }, del: [...pending.diff.extras.del] },
        note: pending.diff.note,
        placed: pending.diff.placed,
        placedAt: pending.diff.placedAt,
      },
      date: pending.date,
      name: pending.name,
      side: pending.side,
    };
  }

  const enqueueRef = useRef<() => Promise<void>>(async () => {});

  function enqueueFlush(): Promise<void> {
    const taken = takePending();
    const run = chainRef.current.then(async () => {
      await writePending(taken);
      if (
        pendingRef.current &&
        !isEmptyDiff(pendingRef.current.diff) &&
        pendingRef.current.date === dateRef.current &&
        pendingRef.current.name === nameRef.current
      ) {
        schedule(true);
      }
    });
    chainRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
  enqueueRef.current = enqueueFlush;

  function schedule(immediate: boolean) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void enqueueRef.current().catch(() => undefined);
    }, immediate ? 0 : SAVE_DEBOUNCE_MS);
  }

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const stale =
      pendingRef.current &&
      (pendingRef.current.date !== date || pendingRef.current.name !== myName);
    if (stale) void enqueueRef.current().catch(() => undefined);
    if (pendingRef.current && pendingRef.current.date !== date) pendingRef.current = null;

    localSeq.current = 0;
    ackedSeq.current = 0;
    pauseRemote.current = false;
    const empty = emptyOrder([myName]);
    draftRef.current = empty;
    setMyOrder(empty);
    setReady(false);
    setRewritten(false);
    setSaveStatus("idle");
    setSaveError(null);
    setGroupError(null);

    const db = getDb();
    const unsubOrders = onSnapshot(
      collection(db, daysCollection(side), date, "orders"),
      (snap) => {
        const list = snap.docs.map((item) => parseOrder(item.id, item.data()));
        ordersRef.current = list;
        setOrders(list);
        setReady(true);
        applyIfClean();
      },
      (err) => {
        setSaveError(messageOf(err));
        setSaveStatus("error");
        setReady(true);
      },
    );
    const unsubMembers = onSnapshot(
      collection(db, daysCollection(side), date, "members"),
      (snap) => {
        const next: Record<string, string> = {};
        snap.forEach((item) => {
          next[item.id] = String(item.data().orderId ?? "");
        });
        pointersRef.current = next;
        setPointers(next);
        applyIfClean();
      },
      (err) => {
        setSaveError(messageOf(err));
        setSaveStatus("error");
      },
    );
    return () => {
      unsubOrders();
      unsubMembers();
      if (timer.current) clearTimeout(timer.current);
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending && !isEmptyDiff(pending.diff)) {
        void saveOrderDiff(getDb(), pending.side, pending.date, pending.name, pending.diff).catch(() => undefined);
      }
    };
    // applyIfClean closes over the latest setters; refs hold the mutable sync state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, myName, side]);

  function mutate(update: (order: OrderDraft) => OrderDraft, immediate = false) {
    if (pauseRemote.current) return;
    const prev = draftRef.current;
    const next = update(prev);
    const piece = diffOrder(prev, next);
    if (isEmptyDiff(piece)) return;
    const current = pendingRef.current;
    const sameScope =
      current &&
      current.date === dateRef.current &&
      current.name === nameRef.current &&
      current.side === sideRef.current;
    pendingRef.current = {
      diff: sameScope ? combineOrderDiff(current.diff, piece) : piece,
      date: dateRef.current,
      name: nameRef.current,
      side: sideRef.current,
    };
    localSeq.current += 1;
    draftRef.current = next;
    setMyOrder(next);
    if (prev.placed && !next.placed) setRewritten(true);
    if (next.placed) setRewritten(false);
    setSaveError(null);
    setSaveStatus("saving");
    schedule(immediate);
  }

  async function flushPending() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    await enqueueRef.current();
    while (pendingRef.current && !isEmptyDiff(pendingRef.current.diff)) {
      await enqueueRef.current();
    }
  }

  async function saveGroup(selected: string[]) {
    setGroupBusy(true);
    setGroupError(null);
    pauseRemote.current = true;
    try {
      await flushPending();
      const merged = await formGroup(getDb(), sideRef.current, dateRef.current, nameRef.current, selected);
      const clean = cloneDraft(merged);
      localSeq.current += 1;
      ackedSeq.current = localSeq.current;
      pendingRef.current = null;
      draftRef.current = clean;
      setMyOrder(clean);
      setRewritten(false);
      setSaveStatus("saved");
      setSaveError(null);
    } catch (err) {
      setGroupError(messageOf(err));
      pauseRemote.current = false;
      applyIfClean();
    } finally {
      pauseRemote.current = false;
      setGroupBusy(false);
      const expected = draftRef.current.members;
      const next = resolveMine(ordersRef.current, pointersRef.current, nameRef.current);
      if (
        next &&
        shouldApplyRemote(localSeq.current, ackedSeq.current) &&
        sameMembers(next.members, expected)
      ) {
        draftRef.current = next;
        setMyOrder(next);
      }
    }
  }

  async function leave() {
    setGroupBusy(true);
    setGroupError(null);
    pauseRemote.current = true;
    try {
      await flushPending();
      await leaveGroup(getDb(), sideRef.current, dateRef.current, nameRef.current);
      const solo = emptyOrder([nameRef.current]);
      localSeq.current += 1;
      ackedSeq.current = localSeq.current;
      pendingRef.current = null;
      draftRef.current = solo;
      setMyOrder(solo);
      setRewritten(false);
      setSaveStatus("saved");
      setSaveError(null);
    } catch (err) {
      setGroupError(messageOf(err));
      pauseRemote.current = false;
      applyIfClean();
    } finally {
      pauseRemote.current = false;
      setGroupBusy(false);
      const next = resolveMine(ordersRef.current, pointersRef.current, nameRef.current);
      if (
        next &&
        shouldApplyRemote(localSeq.current, ackedSeq.current) &&
        sameMembers(next.members, [nameRef.current]) &&
        Object.keys(next.items).length === 0 &&
        Object.keys(next.extras).length === 0
      ) {
        draftRef.current = next;
        setMyOrder(next);
      }
    }
  }

  return {
    orders,
    pointers,
    myOrder,
    ready,
    saveStatus,
    saveError,
    rewritten,
    groupError,
    groupBusy,
    canPlace: canPlace(myOrder),
    setItemQty: (list: ListName, id: string, qty: number) => mutate((order) => setQty(order, list, id, qty)),
    clear: (list: ListName) => mutate((order) => clearList(order, list)),
    setNote: (note: string) => mutate((order) => setNote(order, note)),
    place: () => {
      if (!canPlace(draftRef.current)) return;
      mutate((order) => placeOrder(order, Date.now()), true);
    },
    retry: () => {
      setSaveStatus("saving");
      setSaveError(null);
      if (timer.current) clearTimeout(timer.current);
      void enqueueRef.current().catch(() => undefined);
    },
    saveGroup,
    leave,
  };
}
