import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDb } from "../firebase";
import { messageOf } from "../lib/errors";

export function useProfile(uid: string | undefined) {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(uid));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    return onSnapshot(
      doc(getDb(), "users", uid),
      (snap) => {
        const value = snap.exists() ? snap.data().name : null;
        setName(typeof value === "string" && value ? value : null);
        setLoading(false);
      },
      (err) => {
        setError(messageOf(err));
        setLoading(false);
      },
    );
  }, [uid]);

  return { name, loading, error };
}
