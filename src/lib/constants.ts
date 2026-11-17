// Keep this email in sync with isAdmin() in firestore.rules.
export const ADMIN_EMAILS = ["26m0311@iitb.ac.in"] as const;

export const TEAM = [
  "Abhay",
  "Chirantan",
  "Priyesh",
  "Jeet",
  "Mihir",
  "Sadarul",
  "Siddhant",
  "Pratik",
  "Rutuja",
  "Tanay",
  "Varun",
  "Vishwas",
  "Subhalakshmi",
  "Bhavya",
  "Manali",
  "Medini",
  "Sandeep",
  "Punarvas",
  "Sarthak",
  "Vityashri",
  "Yogeshwar",
] as const;

export const TEAM_SIZE = TEAM.length;

export const PLACEMENT_MANAGERS = ["Laxami", "Priyanka", "Aryan", "Ishika", "Chinmay"] as const;

export const PLACEMENT_SIZE = PLACEMENT_MANAGERS.length;
export const DEFAULT_BUDGET = 6000;
export const SAVE_DEBOUNCE_MS = 400;

export type Side = "apc" | "placement";

const TEAM_LIST: readonly string[] = TEAM;
const PLACEMENT_LIST: readonly string[] = PLACEMENT_MANAGERS;

export function rosterFor(side: Side): readonly string[] {
  return side === "placement" ? PLACEMENT_LIST : TEAM_LIST;
}

export function headcountFor(side: Side): number {
  return side === "placement" ? PLACEMENT_SIZE : TEAM_SIZE;
}

export function isSideName(side: Side, name: string): boolean {
  return rosterFor(side).includes(name);
}

export function isTeamName(name: string): boolean {
  return isSideName("apc", name);
}

/** Missing role on an account that already has a name is the original APC group. */
export function resolveSide(role: unknown, name: string | null): Side | null {
  if (role === "placement") return "placement";
  if (role === "apc") return "apc";
  if (name) return "apc";
  return null;
}

export function claimsCollection(side: Side): string {
  return side === "placement" ? "placementClaims" : "claims";
}

export function daysCollection(side: Side): string {
  return side === "placement" ? "placementDays" : "days";
}

export function budgetsCollection(side: Side): string {
  return side === "placement" ? "placementBudgets" : "budgets";
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return ADMIN_EMAILS.some((entry) => entry.toLowerCase() === lower);
}

export function sortByRoster(names: readonly string[], roster: readonly string[]): string[] {
  return [...names].sort((a, b) => {
    const ia = roster.indexOf(a);
    const ib = roster.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
}

export function sortByTeam(names: readonly string[]): string[] {
  return sortByRoster(names, TEAM_LIST);
}
