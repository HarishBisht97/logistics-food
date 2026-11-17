import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "../firebase";
import { budgetsCollection, type Side } from "../lib/constants";
import { budgetAmount } from "../lib/money";
import { messageOf } from "../lib/errors";
import { saveBudget } from "../lib/ordersRepo";

export function useBudget(date: string, side: Side) {
  const [amount, setAmount] = useState(budgetAmount(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setLoading(true);
    return onSnapshot(
      doc(getDb(), budgetsCollection(side), date),
      (snap) => {
        const stored = snap.exists() ? Number(snap.data().amount) : null;
        setAmount(budgetAmount(stored));
        setLoading(false);
      },
      (err) => {
        setError(messageOf(err));
        setLoading(false);
      },
    );
  }, [date, side]);

  async function save(next: number) {
    setStatus("saving");
    setError(null);
    try {
      await saveBudget(getDb(), side, date, next);
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setError(messageOf(err));
    }
  }

  return { amount, loading, error, status, save };
}
