package rw.ikiminaconnect.loan;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GuaranteeRepository extends JpaRepository<Guarantee, UUID> {
    List<Guarantee> findAllByLoanId(UUID loanId);

    // Guarantor-side queries (list pending requests, the guarantor-lock check)
    // arrive in phase 6 alongside the respond endpoint — not added here to
    // avoid unused surface area for a workflow this phase doesn't build yet.
}
