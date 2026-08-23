package rw.ikiminaconnect.ledger;

import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import rw.ikiminaconnect.common.PageResponse;
import rw.ikiminaconnect.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/ledger")
@PreAuthorize("hasAnyRole('ACCOUNTANT','ORG_ADMIN')")
public class LedgerController {

    private final LedgerService ledgerService;

    public LedgerController(LedgerService ledgerService) {
        this.ledgerService = ledgerService;
    }

    @GetMapping
    public PageResponse<LedgerTransactionDto> search(
            @AuthenticationPrincipal CurrentUser currentUser,
            @RequestParam(required = false) LedgerTxType type,
            @RequestParam(required = false) LedgerTxMethod method,
            @RequestParam(required = false) UUID memberId,
            Pageable pageable) {
        return PageResponse.from(
                ledgerService.search(currentUser.organizationId(), type, method, memberId, pageable));
    }
}
