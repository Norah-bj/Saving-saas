package rw.ikiminaconnect.payroll;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PayrollImportSummaryDto(
        UUID id,
        String fileName,
        String importedBy,
        LocalDate occurredOn,
        int totalRecords,
        int successful,
        int failed,
        int duplicates,
        BigDecimal totalAmountRwf) {

    public static PayrollImportSummaryDto from(PayrollImportSummary s) {
        return new PayrollImportSummaryDto(
                s.getId(), s.getFileName(), s.getImportedByName(), s.getOccurredOn(),
                s.getTotalRecords(), s.getSuccessful(), s.getFailed(), s.getDuplicates(),
                s.getTotalAmountRwf());
    }
}
