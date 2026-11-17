import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { getDb } from "../firebase";
import { isAdminEmail } from "../lib/constants";
import { messageOf } from "../lib/errors";

export function useAdmin(email: string | null | undefined) {
  const seed = isAdminEmail(email);
  const [granted, setGranted] = useState(false);
  const [loading, setLoading] = useState(!seed && Boolean(email));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email || seed) {
      setGranted(false);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    return onSnapshot(
      doc(getDb(), "admins", email.toLowerCase()),
      (snap) => {
        setGranted(snap.exists());
        setLoading(false);
      },
      (err) => {
        setError(messageOf(err));
        setGranted(false);
        setLoading(false);
      },
    );
  }, [email, seed]);

  return { admin: seed || granted, loading, error };
}

export function useAdminList() {
  const [emails, setEmails] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      collection(getDb(), "admins"),
      (snap) => {
        setEmails(snap.docs.map((item) => item.id).sort());
        setError(null);
      },
      (err) => setError(messageOf(err)),
    );
  }, []);

  return { emails, error };
}
