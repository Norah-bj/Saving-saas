package rw.ikiminaconnect.payroll;

import java.math.BigDecimal;

public record PayrollImportRecordDto(
        String employeeId,
        String nationalId,
        String name,
        BigDecimal amount,
        PayrollImportStatus status,
        String errorReason) {

    public static PayrollImportRecordDto from(PayrollImportRecord r) {
        return new PayrollImportRecordDto(
                r.getEmployeeId(), r.getNationalId(), r.getMemberName(), r.getAmount(),
                r.getStatus(), r.getErrorReason());
    }
}
