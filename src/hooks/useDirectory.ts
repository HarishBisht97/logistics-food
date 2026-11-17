import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { getDb } from "../firebase";
import { claimsCollection, type Side } from "../lib/constants";
import { messageOf } from "../lib/errors";

export type DirectoryUser = { uid: string; email: string; name: string | null };

export function useClaims(side: Side) {
  const [claims, setClaims] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      collection(getDb(), claimsCollection(side)),
      (snap) => {
        const next: Record<string, string> = {};
        snap.forEach((item) => {
          next[item.id] = String(item.data().uid ?? "");
        });
        setClaims(next);
      },
      (err) => setError(messageOf(err)),
    );
  }, [side]);

  return { claims, error };
}

export function useUsers() {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      collection(getDb(), "users"),
      (snap) => {
        setUsers(
          snap.docs.map((item) => {
            const data = item.data();
            return {
              uid: item.id,
              email: typeof data.email === "string" ? data.email : "",
              name: typeof data.name === "string" && data.name ? data.name : null,
            };
          }),
        );
      },
      (err) => setError(messageOf(err)),
    );
  }, []);

  return { users, error };
}
