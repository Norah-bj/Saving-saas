package rw.ikiminaconnect.ledger;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** Mirrors src/lib/types.ts's LedgerTransaction.method union ("mobile-money" has a hyphen). */
public enum LedgerTxMethod {
    PAYROLL, CASH, MOBILE_MONEY, BANK_TRANSFER;

    @JsonValue
    public String toValue() {
        return name().toLowerCase().replace('_', '-');
    }

    @JsonCreator
    public static LedgerTxMethod fromValue(String value) {
        return LedgerTxMethod.valueOf(value.toUpperCase().replace('-', '_'));
    }
}
