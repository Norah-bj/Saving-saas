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

    public SavingsController(SavingsService savingsService) {
        this.savingsService = savingsService;
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
        return savingsService.buyShares(
                currentUser.organizationId(), memberId, request, currentUser.userId(), currentUser.fullName());
    }
}
