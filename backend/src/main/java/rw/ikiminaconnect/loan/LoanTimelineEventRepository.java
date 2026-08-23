package rw.ikiminaconnect.loan;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoanTimelineEventRepository extends JpaRepository<LoanTimelineEvent, UUID> {
    List<LoanTimelineEvent> findAllByLoanIdOrderByCreatedAtAsc(UUID loanId);
}
