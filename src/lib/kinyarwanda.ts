// Small, bounded Kinyarwanda lookups for the loan contract templates — not a
// general number-to-words engine. The repayment period only ever comes from
// an organization's `allowedRepaymentPeriods`, and months are always one of
// the 12 calendar months, so fixed lookup tables are the right tool here.

export const PERIOD_WORDS_RW: Record<number, string> = {
  1: "Rimwe",
  2: "Kabiri",
  3: "Itatu",
  4: "Enye",
  5: "Gatanu",
  6: "Atandatu",
  7: "Zirindwi",
  8: "Umunani",
  9: "Zenda",
  10: "Cumi",
  12: "Cumi n'abiri",
  18: "Cumi n'umunani",
  24: "Makumyabiri n'ane",
  36: "Mirongo itatu n'atandatu",
};

export function periodWordsRw(months: number): string {
  return PERIOD_WORDS_RW[months] ?? String(months);
}

export const MONTH_NAME_RW = [
  "Mutarama",
  "Gashyantare",
  "Werurwe",
  "Mata",
  "Gicurasi",
  "Kamena",
  "Nyakanga",
  "Kanama",
  "Nzeli",
  "Ukwakira",
  "Ugushyingo",
  "Ukuboza",
];

export function monthYearRw(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_NAME_RW[d.getMonth()]} ${d.getFullYear()}`;
}

/** "kuwa DD/MM/YYYY", matching the real contract documents' date format. */
export function formatDateRw(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `kuwa ${dd}/${mm}/${d.getFullYear()}`;
}
