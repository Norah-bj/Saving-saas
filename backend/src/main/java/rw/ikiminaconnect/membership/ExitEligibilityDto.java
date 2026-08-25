package rw.ikiminaconnect.membership;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ExitEligibilityDto(
        boolean eligible,
        List<OutstandingLoan> outstandingLoans,
        List<ActiveGuarantee> activeGuarantees) {

    /** Enough for the exit-request UI to display and link to the blocking loan — not the full LoanDetailDto. */
    public record OutstandingLoan(UUID id, String contractNumber, BigDecimal remainingBalance) {
    }

    public record ActiveGuarantee(UUID guaranteeId, String loanContractNumber, BigDecimal amountGuaranteed) {
    }
}
