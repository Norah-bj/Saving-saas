package rw.ikiminaconnect.loan;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import rw.ikiminaconnect.common.ForbiddenException;
import rw.ikiminaconnect.common.PageResponse;
import rw.ikiminaconnect.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/loans")
public class LoanController {

    private static final java.util.Set<String> STAFF_ROLES =
            java.util.Set.of("secretary", "accountant", "loan-committee", "org-admin", "hr");

    private final LoanApplicationService loanApplicationService;

    public LoanController(LoanApplicationService loanApplicationService) {
        this.loanApplicationService = loanApplicationService;
    }

    @PostMapping("/calculate")
    public LoanCalculationResponse calculate(
            @AuthenticationPrincipal CurrentUser currentUser, @Valid @RequestBody LoanCalculationRequest request) {
        return loanApplicationService.calculate(currentUser.organizationId(), currentUser.userId(), request);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LoanDetailDto apply(
            @AuthenticationPrincipal CurrentUser currentUser, @Valid @RequestBody ApplyLoanRequest request) {
        return loanApplicationService.apply(
                currentUser.organizationId(), currentUser.userId(), currentUser.fullName(), request);
    }

    @GetMapping
    public PageResponse<LoanSummaryDto> list(
            @AuthenticationPrincipal CurrentUser currentUser,
            @RequestParam(required = false) UUID memberId,
            Pageable pageable) {
        boolean isStaff = currentUser.roles().stream().anyMatch(STAFF_ROLES::contains);
        UUID effectiveFilter = isStaff ? memberId : currentUser.userId();
        return PageResponse.from(loanApplicationService.list(currentUser.organizationId(), effectiveFilter, pageable));
    }

    @GetMapping("/{id}")
    public LoanDetailDto get(@AuthenticationPrincipal CurrentUser currentUser, @PathVariable UUID id) {
        LoanDetailDto loan = loanApplicationService.get(currentUser.organizationId(), id);
        boolean isStaff = currentUser.roles().stream().anyMatch(STAFF_ROLES::contains);
        if (!isStaff && !loan.memberId().equals(currentUser.userId())) {
            throw new ForbiddenException("You can only view your own loans.");
        }
        return loan;
    }
}
