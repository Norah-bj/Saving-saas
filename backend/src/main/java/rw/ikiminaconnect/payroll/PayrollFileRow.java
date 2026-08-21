package rw.ikiminaconnect.payroll;

import java.math.BigDecimal;

/** One raw row read from the uploaded file, before any business-rule validation. */
public record PayrollFileRow(String employeeId, BigDecimal amount) {
}
