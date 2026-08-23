package rw.ikiminaconnect.contract;

import java.time.LocalDate;
import java.util.Map;

/**
 * Ports src/lib/kinyarwanda.ts exactly. Small, bounded lookups for the loan
 * contract template — not a general number-to-words engine. The repayment
 * period only ever comes from an organization's allowedRepaymentPeriods, and
 * months are always one of the 12 calendar months, so fixed lookup tables
 * are the right tool here, same reasoning as the frontend.
 */
public final class KinyarwandaText {

    private KinyarwandaText() {
    }

    private static final Map<Integer, String> PERIOD_WORDS_RW = Map.ofEntries(
            Map.entry(1, "Rimwe"), Map.entry(2, "Kabiri"), Map.entry(3, "Itatu"),
            Map.entry(4, "Enye"), Map.entry(5, "Gatanu"), Map.entry(6, "Atandatu"),
            Map.entry(7, "Zirindwi"), Map.entry(8, "Umunani"), Map.entry(9, "Zenda"),
            Map.entry(10, "Cumi"), Map.entry(12, "Cumi n'abiri"), Map.entry(18, "Cumi n'umunani"),
            Map.entry(24, "Makumyabiri n'ane"), Map.entry(36, "Mirongo itatu n'atandatu"));

    private static final String[] MONTH_NAME_RW = {
            "Mutarama", "Gashyantare", "Werurwe", "Mata", "Gicurasi", "Kamena",
            "Nyakanga", "Kanama", "Nzeli", "Ukwakira", "Ugushyingo", "Ukuboza",
    };

    public static String periodWordsRw(int months) {
        return PERIOD_WORDS_RW.getOrDefault(months, String.valueOf(months));
    }

    public static String monthYearRw(LocalDate date) {
        return MONTH_NAME_RW[date.getMonthValue() - 1] + " " + date.getYear();
    }

    /** "kuwa DD/MM/YYYY", matching the real contract documents' date format. */
    public static String formatDateRw(LocalDate date) {
        return "kuwa %02d/%02d/%d".formatted(date.getDayOfMonth(), date.getMonthValue(), date.getYear());
    }

    public static LocalDate plusMonthsInclusive(LocalDate start, int periodMonths) {
        return start.plusMonths(periodMonths - 1L);
    }
}
