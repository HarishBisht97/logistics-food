import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "../firebase";
import { resolveSide, type Side } from "../lib/constants";
import { messageOf } from "../lib/errors";

export function useProfile(uid: string | undefined) {
  const [name, setName] = useState<string | null>(null);
  const [side, setSide] = useState<Side | null>(null);
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    return onSnapshot(
      doc(getDb(), "users", uid),
      (snap) => {
        const value = snap.exists() ? snap.data().name : null;
        const nextName = typeof value === "string" && value ? value : null;
        const role = snap.exists() ? snap.data().role : null;
        setName(nextName);
        setSide(resolveSide(role, nextName));
        setLoading(false);
      },
      (err) => {
        setError(messageOf(err));
        setLoading(false);
      },
    );
  }, [uid]);

  return { name, side, loading, error };
}
