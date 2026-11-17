// Keep this email in sync with isAdmin() in firestore.rules.
export const ADMIN_EMAILS = ["26M0307@iitb.ac.in"] as const;

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
export const DEFAULT_BUDGET = 6000;
export const SAVE_DEBOUNCE_MS = 400;

const TEAM_LIST: readonly string[] = TEAM;

export function isTeamName(name: string): boolean {
  return TEAM_LIST.includes(name);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return ADMIN_EMAILS.some((entry) => entry.toLowerCase() === lower);
}

export function sortByTeam(names: readonly string[]): string[] {
  return [...names].sort((a, b) => {
    const ia = TEAM_LIST.indexOf(a);
    const ib = TEAM_LIST.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
}
