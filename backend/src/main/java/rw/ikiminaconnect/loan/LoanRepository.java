package rw.ikiminaconnect.loan;

import java.util.List;
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

    // Exit eligibility (membership.ExitRequestService): a member's own loans
    // that represent real outstanding debt — DISBURSED/REPAYING only, since a
    // loan that hasn't been disbursed yet isn't actual financial exposure.
    List<Loan> findAllByOrganizationIdAndMemberIdAndStatusIn(
            UUID organizationId, UUID memberId, List<LoanStatus> statuses);
}
