package rw.ikiminaconnect.loan;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Builds a {@link LoanDetailDto} (guarantor IDs + timeline) from a
 * {@link Loan}. Shared by every service that returns loan detail
 * (application, review, and — once built — contract/disbursement) so this
 * mapping exists in exactly one place.
 */
@Component
public class LoanDetailAssembler {

    private final GuaranteeRepository guaranteeRepository;
    private final LoanTimelineEventRepository timelineRepository;

    public LoanDetailAssembler(GuaranteeRepository guaranteeRepository, LoanTimelineEventRepository timelineRepository) {
        this.guaranteeRepository = guaranteeRepository;
        this.timelineRepository = timelineRepository;
    }

    public LoanDetailDto toDetail(Loan loan) {
        List<UUID> guarantorIds = guaranteeRepository.findAllByLoanId(loan.getId()).stream()
                .map(Guarantee::getGuarantorId)
                .toList();
        List<LoanTimelineEventDto> timeline = timelineRepository.findAllByLoanIdOrderByCreatedAtAsc(loan.getId())
                .stream()
                .map(LoanTimelineEventDto::from)
                .toList();
        return LoanDetailDto.from(loan, guarantorIds, timeline);
    }
}
