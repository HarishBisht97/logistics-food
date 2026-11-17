export function messageOf(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = String((err as { code: unknown }).code);
    if (code === "permission-denied") {
      return "Permission denied. Sign in again, or ask the admin to check the Firestore rules.";
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong while saving.";
}
