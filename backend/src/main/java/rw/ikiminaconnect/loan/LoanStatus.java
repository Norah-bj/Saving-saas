package rw.ikiminaconnect.loan;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Mirrors src/lib/types.ts's LoanStatus union — same hyphen-handling as member.Role. */
public enum LoanStatus {
    SUBMITTED, UNDER_REVIEW, GUARANTOR_APPROVAL, COMMITTEE_REVIEW, APPROVED, REJECTED,
    CONTRACT_GENERATED, DISBURSED, REPAYING, COMPLETED;

    @JsonValue
    public String toValue() {
        return name().toLowerCase().replace('_', '-');
    }

    @JsonCreator
    public static LoanStatus fromValue(String value) {
        return LoanStatus.valueOf(value.toUpperCase().replace('-', '_'));
    }
}
