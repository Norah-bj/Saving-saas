package rw.ikiminaconnect.loan;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GuaranteeRepository extends JpaRepository<Guarantee, UUID> {
    List<Guarantee> findAllByLoanId(UUID loanId);

    Optional<Guarantee> findByIdAndOrganizationId(UUID id, UUID organizationId);

    List<Guarantee> findAllByOrganizationIdAndGuarantorIdOrderByRequestedDateDesc(
            UUID organizationId, UUID guarantorId);

    // Exit eligibility (membership.ExitRequestService).
    List<Guarantee> findAllByOrganizationIdAndGuarantorIdAndStatus(
            UUID organizationId, UUID guarantorId, GuaranteeStatus status);

    // The guarantor-lock rule (BACKEND_CONTRACT.md): a member actively
    // guaranteeing someone else's loan cannot apply for a new loan of their
    // own until that guarantee is released.
    boolean existsByOrganizationIdAndGuarantorIdAndStatus(
            UUID organizationId, UUID guarantorId, GuaranteeStatus status);
}
