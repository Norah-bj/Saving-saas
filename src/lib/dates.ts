/**
 * Whole calendar months between two ISO dates (day of month ignored) — the
 * same month math the backend's LoanApplicationService uses for loan
 * eligibility tenure, so the UI's eligibility hint matches the server.
 */
export function monthsBetween(fromIso: string, toIso: string) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}
