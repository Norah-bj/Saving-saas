package rw.ikiminaconnect.membership;

import java.util.List;

public record ExitEligibilityDto(
        boolean eligible, List<String> outstandingLoanContractNumbers, List<String> activeGuaranteeLoanContractNumbers) {
}
