package rw.ikiminaconnect.savings;

import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import rw.ikiminaconnect.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/members/{memberId}")
public class SavingsController {

    private static final String SELF_OR_STAFF =
            "#memberId == authentication.principal.userId() or hasAnyRole('ACCOUNTANT','SECRETARY','ORG_ADMIN')";

    private final SavingsService savingsService;
    private final rw.ikiminaconnect.common.PaymentsMode paymentsMode;

    public SavingsController(SavingsService savingsService, rw.ikiminaconnect.common.PaymentsMode paymentsMode) {
        this.savingsService = savingsService;
        this.paymentsMode = paymentsMode;
    }

    /**
     * A member putting money in from their own dashboard (as opposed to staff
     * recording a payment they received). There's no payment provider yet, so
     * this is only allowed in demo mode — see common/PaymentsMode.
     */
    private boolean isSelfService(CurrentUser currentUser, java.util.UUID memberId) {
        return memberId.equals(currentUser.userId());
    }

    @GetMapping("/savings-ledger")
    @PreAuthorize(SELF_OR_STAFF)
    public SavingsLedgerResponse ledger(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable java.util.UUID memberId,
            Pageable pageable) {
        return savingsService.ledger(currentUser.organizationId(), memberId, pageable);
    }

    @PostMapping("/savings/voluntary")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(SELF_OR_STAFF)
    public SavingsTransactionDto addVoluntarySaving(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable java.util.UUID memberId,
            @Valid @RequestBody VoluntarySavingRequest request) {
        if (isSelfService(currentUser, memberId)) {
            paymentsMode.requireSelfServiceAllowed();
            // Label it in the ledger so demo money is never mistaken for a real payment.
            request = new VoluntarySavingRequest(request.amountRwf(), rw.ikiminaconnect.common.PaymentsMode.DEMO_SOURCE);
        }
        return savingsService.addVoluntarySaving(
                currentUser.organizationId(), memberId, request, currentUser.userId(), currentUser.fullName());
    }

    @PostMapping("/shares/buy")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(SELF_OR_STAFF)
    public BuySharesResponse buyShares(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable java.util.UUID memberId,
            @Valid @RequestBody BuySharesRequest request) {
        if (isSelfService(currentUser, memberId)) {
            paymentsMode.requireSelfServiceAllowed();
        }
        return savingsService.buyShares(
                currentUser.organizationId(), memberId, request, currentUser.userId(), currentUser.fullName());
    }
}
