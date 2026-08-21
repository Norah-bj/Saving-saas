package rw.ikiminaconnect.payroll;

import java.util.List;

public record PayrollImportResult(PayrollImportSummaryDto summary, List<PayrollImportRecordDto> rows) {
}
