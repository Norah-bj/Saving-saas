package rw.ikiminaconnect.loan;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.audit.AuditService;
import rw.ikiminaconnect.common.ConflictException;
import rw.ikiminaconnect.common.NotFoundException;
import rw.ikiminaconnect.ledger.LedgerTransaction;
import rw.ikiminaconnect.ledger.LedgerTransactionRepository;
import rw.ikiminaconnect.ledger.LedgerTxMethod;
import rw.ikiminaconnect.ledger.LedgerTxType;

/**
 * Disbursement and salary-based repayment (roadmap phases 9-10). Ports
 * data-store.ts's disburseLoan and recordRepayment exactly, including the
 * "min(monthlyInstallment, remainingBalance)" final-payment handling and
 * releasing the guarantor's guarantee once the loan is fully repaid.
 *
 * <p>One addition beyond the frontend mock: recordRepayment there writes no
 * audit log entry at all (disburseLoan does) — that's a gap in the mock, not
 * a real business rule to preserve. BACKEND_CONTRACT.md requires every
 * mutating endpoint to write an audit entry, so this does.
 */
@Service
public class LoanDisbursementService {

    private final LoanRepository loanRepository;
    private final LoanTimelineEventRepository timelineRepository;
    private final GuaranteeRepository guaranteeRepository;
    private final LedgerTransactionRepository ledgerTransactionRepository;
    private final AuditService auditService;
    private final LoanDetailAssembler loanDetailAssembler;

    public LoanDisbursementService(
            LoanRepository loanRepository,
            LoanTimelineEventRepository timelineRepository,
            GuaranteeRepository guaranteeRepository,
            LedgerTransactionRepository ledgerTransactionRepository,
            AuditService auditService,
            LoanDetailAssembler loanDetailAssembler) {
        this.loanRepository = loanRepository;
        this.timelineRepository = timelineRepository;
        this.guaranteeRepository = guaranteeRepository;
        this.ledgerTransactionRepository = ledgerTransactionRepository;
        this.auditService = auditService;
        this.loanDetailAssembler = loanDetailAssembler;
    }

    @Transactional
    public LoanDetailDto disburse(UUID organizationId, UUID loanId, UUID actorId, String actorName) {
        Loan loan = requireLoan(organizationId, loanId);
        if (loan.getStatus() != LoanStatus.CONTRACT_GENERATED) {
            throw new ConflictException("This loan does not have a generated contract yet (status: "
                    + loan.getStatus().toValue() + ").");
        }

        loan.disburse();
        timelineRepository.save(new LoanTimelineEvent(
                loan.getId(), LoanStatus.DISBURSED, actorName, "Funds disbursed to member's account."));

        ledgerTransactionRepository.save(new LedgerTransaction(
                organizationId, loan.getMemberId(), LedgerTxType.LOAN_DISBURSEMENT_ADJUSTMENT, loan.getAmount(),
                LedgerTxMethod.BANK_TRANSFER, loan.getContractNumber(), actorId, actorName));

        // Revenue recognized in full at disbursement, not amortized per
        // installment — see docs/DECISIONS.md. Interest is a fraction of the
        // loan amount (e.g. 0.05), same rounding convention as
        // LoanContractPdfGenerator's contract text so the two amounts always
        // agree; the insurance fee is already a precomputed BigDecimal set
        // when the loan was applied for, so it's used as-is.
        BigDecimal interestAmount = loan.getAmount().multiply(loan.getInterestRate()).setScale(0, RoundingMode.HALF_UP);
        ledgerTransactionRepository.save(new LedgerTransaction(
                organizationId, loan.getMemberId(), LedgerTxType.INTEREST_INCOME, interestAmount,
                LedgerTxMethod.BANK_TRANSFER, loan.getContractNumber(), actorId, actorName));
        if (loan.isInsuranceRequired()) {
            ledgerTransactionRepository.save(new LedgerTransaction(
                    organizationId, loan.getMemberId(), LedgerTxType.INSURANCE_FEE, loan.getInsuranceFee(),
                    LedgerTxMethod.BANK_TRANSFER, loan.getContractNumber(), actorId, actorName));
        }

        auditService.record(organizationId, actorId, actorName, "Disbursed loan", loan.getContractNumber());
        return loanDetailAssembler.toDetail(loan);
    }

    @Transactional
    public LoanDetailDto recordRepayment(UUID organizationId, UUID loanId, UUID actorId, String actorName) {
        Loan loan = requireLoan(organizationId, loanId);
        if (loan.getStatus() != LoanStatus.DISBURSED && loan.getStatus() != LoanStatus.REPAYING) {
            throw new ConflictException("This loan is not currently disbursed/repaying (status: "
                    + loan.getStatus().toValue() + ").");
        }

        BigDecimal installment = loan.applyRepaymentInstallment();
        boolean completed = loan.isCompleted();

        if (completed) {
            timelineRepository.save(new LoanTimelineEvent(
                    loan.getId(), LoanStatus.COMPLETED, actorName, "Loan fully repaid. Contract closed."));
            List<Guarantee> guarantees = guaranteeRepository.findAllByLoanId(loan.getId());
            for (Guarantee guarantee : guarantees) {
                if (guarantee.getStatus() == GuaranteeStatus.accepted) {
                    guarantee.release();
                }
            }
        } else {
            timelineRepository.save(new LoanTimelineEvent(
                    loan.getId(), LoanStatus.REPAYING, actorName,
                    "Monthly installment of " + formatRwf(installment) + " RWF deducted from payroll."));
        }

        ledgerTransactionRepository.save(new LedgerTransaction(
                organizationId, loan.getMemberId(), LedgerTxType.LOAN_REPAYMENT, installment,
                LedgerTxMethod.PAYROLL, loan.getContractNumber() + " / Installment", actorId, actorName));

        auditService.record(organizationId, actorId, actorName, "Recorded loan repayment", loan.getContractNumber());
        return loanDetailAssembler.toDetail(loan);
    }

    private static String formatRwf(BigDecimal amount) {
        return NumberFormat.getIntegerInstance(Locale.US).format(amount);
    }

    private Loan requireLoan(UUID organizationId, UUID loanId) {
        return loanRepository.findByIdAndOrganizationId(loanId, organizationId)
                .orElseThrow(() -> new NotFoundException("Loan not found."));
    }
}
