import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "../firebase";
import { messageOf } from "../lib/errors";

function authMessage(err: unknown): string {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "";
  switch (code) {
    case "auth/invalid-email":
      return "That email doesn’t look right.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email or password is wrong.";
    case "auth/email-already-in-use":
      return "That email already has an account. Sign in instead.";
    case "auth/weak-password":
      return "Use a password of at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many tries. Wait a minute and try again.";
    case "auth/operation-not-allowed":
      return "Email sign-in is not enabled in Firebase Authentication.";
    default:
      return messageOf(err);
  }
}

export function useAuth() {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    return onAuthStateChanged(getFirebaseAuth(), (next) => {
      setUser(next);
      setLoading(false);
    });
  }, [configured]);

  async function signIn(email: string, password: string) {
    setError(null);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    } catch (err) {
      setError(authMessage(err));
    }
  }

  async function signUp(email: string, password: string) {
    setError(null);
    try {
      await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    } catch (err) {
      setError(authMessage(err));
    }
  }

  async function signOutUser() {
    await signOut(getFirebaseAuth());
  }

  return { configured, user, loading, error, signIn, signUp, signOut: signOutUser };
}
