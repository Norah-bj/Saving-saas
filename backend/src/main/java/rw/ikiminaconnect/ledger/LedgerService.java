package rw.ikiminaconnect.ledger;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read side of the ledger — matches accountant/Transactions.tsx's filterable listing. */
@Service
public class LedgerService {

    private final LedgerTransactionRepository repository;

    public LedgerService(LedgerTransactionRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Page<LedgerTransactionDto> search(
            UUID organizationId, LedgerTxType type, LedgerTxMethod method, UUID memberId, Pageable pageable) {
        return repository.search(organizationId, type, method, memberId, pageable).map(LedgerTransactionDto::from);
    }
}
