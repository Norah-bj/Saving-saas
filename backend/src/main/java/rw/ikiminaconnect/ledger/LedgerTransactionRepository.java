package rw.ikiminaconnect.ledger;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LedgerTransactionRepository extends JpaRepository<LedgerTransaction, UUID> {
    // Listing/reporting queries arrive with phase 11 (accountant reporting) —
    // this phase only ever writes rows, via LoanDisbursementService.
}
