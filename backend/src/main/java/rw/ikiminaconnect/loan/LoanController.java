package rw.ikiminaconnect.loan;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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
    private final LoanReviewService loanReviewService;

    public LoanController(LoanApplicationService loanApplicationService, LoanReviewService loanReviewService) {
        this.loanApplicationService = loanApplicationService;
        this.loanReviewService = loanReviewService;
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

    @PostMapping("/{id}/start-review")
    @PreAuthorize("hasRole('LOAN_COMMITTEE')")
    public LoanDetailDto startReview(@AuthenticationPrincipal CurrentUser currentUser, @PathVariable UUID id) {
        return loanReviewService.startReview(
                currentUser.organizationId(), id, currentUser.userId(), currentUser.fullName());
    }

    /**
     * Coarse role check here (must be Loan Committee at all); the fine-grained
     * chair-only check for guarantor-backed loans happens inside
     * {@link LoanReviewService}, re-reading chair status fresh from the
     * database rather than trusting the JWT claim.
     */
    @PostMapping("/{id}/committee-decision")
    @PreAuthorize("hasRole('LOAN_COMMITTEE')")
    public LoanDetailDto committeeDecision(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody CommitteeDecisionRequest request) {
        return loanReviewService.decide(
                currentUser.organizationId(), id, currentUser.userId(), currentUser.fullName(), request);
    }
}
