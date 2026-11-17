const DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function todayKolkata(now = new Date()): string {
  return DATE_FORMAT.format(now);
}

export function formatPlacedAt(ms: number): string {
  return TIME_FORMAT.format(new Date(ms));
}
