package rw.ikiminaconnect.savings;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Mirrors src/lib/types.ts's SavingsTxType union — same hyphen-handling as member.Role. */
public enum SavingsTxType {
    SALARY_DEDUCTION, VOLUNTARY, SHARE_PURCHASE, LOAN_REPAYMENT, WITHDRAWAL, LOAN_DISBURSEMENT_ADJUSTMENT;

    @JsonValue
    public String toValue() {
        return name().toLowerCase().replace('_', '-');
    }

    @JsonCreator
    public static SavingsTxType fromValue(String value) {
        return SavingsTxType.valueOf(value.toUpperCase().replace('-', '_'));
    }
}
