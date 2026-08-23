package rw.ikiminaconnect.loan;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoanRepository extends JpaRepository<Loan, UUID> {
    Optional<Loan> findByIdAndOrganizationId(UUID id, UUID organizationId);

    Page<Loan> findAllByOrganizationIdOrderByCreatedAtDesc(UUID organizationId, Pageable pageable);

    Page<Loan> findAllByOrganizationIdAndMemberIdOrderByCreatedAtDesc(
            UUID organizationId, UUID memberId, Pageable pageable);

    long countByOrganizationId(UUID organizationId);
}
