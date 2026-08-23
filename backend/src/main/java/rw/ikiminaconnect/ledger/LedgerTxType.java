package rw.ikiminaconnect.ledger;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Mirrors src/lib/types.ts's LedgerTransaction.type union exactly (same
 * hyphen-handling pattern as member.Role / savings.SavingsTxType / loan.LoanStatus).
 * Only DISBURSEMENT_ADJUSTMENT and LOAN_REPAYMENT are inserted by this
 * phase — the rest belong to later reporting phases but are the same
 * stable domain vocabulary from types.ts, not speculative additions.
 */
public enum LedgerTxType {
    SALARY_DEDUCTION, VOLUNTARY, SHARE_PURCHASE, LOAN_REPAYMENT,
    WITHDRAWAL, LOAN_DISBURSEMENT_ADJUSTMENT, INSURANCE_FEE, INTEREST_INCOME;

    @JsonValue
    public String toValue() {
        return name().toLowerCase().replace('_', '-');
    }

    @JsonCreator
    public static LedgerTxType fromValue(String value) {
        return LedgerTxType.valueOf(value.toUpperCase().replace('-', '_'));
    }
}
