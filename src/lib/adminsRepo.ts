import { deleteDoc, doc, setDoc, type Firestore } from "firebase/firestore";
import { isAdminEmail } from "./constants";
import { messageOf } from "./errors";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function grantAdmin(db: Firestore, email: string): Promise<void> {
  const lower = normalizeAdminEmail(email);
  if (!EMAIL.test(lower)) throw new Error("Enter a valid email");
  if (isAdminEmail(lower)) throw new Error("That address is already a permanent admin");
  try {
    await setDoc(doc(db, "admins", lower), { email: lower });
  } catch (err) {
    throw new Error(messageOf(err));
  }
}

export async function revokeAdmin(db: Firestore, email: string): Promise<void> {
  const lower = normalizeAdminEmail(email);
  if (isAdminEmail(lower)) throw new Error("The original admin cannot be removed");
  try {
    await deleteDoc(doc(db, "admins", lower));
  } catch (err) {
    throw new Error(messageOf(err));
  }
}
