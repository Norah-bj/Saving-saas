package rw.ikiminaconnect.reporting;

import java.math.BigDecimal;

public record CashFlowPoint(String month, BigDecimal moneyIn, BigDecimal moneyOut) {
}
