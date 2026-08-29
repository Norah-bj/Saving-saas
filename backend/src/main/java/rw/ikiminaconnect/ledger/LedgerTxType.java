package rw.ikiminaconnect.ledger;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Mirrors src/lib/types.ts's LedgerTransaction.type union exactly (same
 * hyphen-handling pattern as member.Role / savings.SavingsTxType / loan.LoanStatus).
 * INTEREST_INCOME and INSURANCE_FEE are written by LoanDisbursementService.disburse()
 * (see docs/DECISIONS.md — recognized in full at disbursement, not amortized);
 * SALARY_DEDUCTION is written by payroll import; the rest by
 * LoanDisbursementService and savings/share-withdrawal flows.
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
