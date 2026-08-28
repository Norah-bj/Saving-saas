package rw.ikiminaconnect.reporting;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.ledger.LedgerTransaction;
import rw.ikiminaconnect.ledger.LedgerTransactionRepository;
import rw.ikiminaconnect.ledger.LedgerTxType;
import rw.ikiminaconnect.loan.LoanRepository;
import rw.ikiminaconnect.loan.LoanStatus;
// import rw.ikiminaconnect.loan.LoanStatusCount;
import rw.ikiminaconnect.member.MemberRepository;
import rw.ikiminaconnect.organization.Organization;
import rw.ikiminaconnect.organization.OrganizationRepository;
import rw.ikiminaconnect.savings.SavingsTransaction;
import rw.ikiminaconnect.savings.SavingsTransactionRepository;
import rw.ikiminaconnect.savings.SavingsTxType;
import rw.ikiminaconnect.savings.ShareHoldingRepository;

/**
 * Accountant reporting (roadmap phase 11). Ports accountant/Dashboard.tsx
 * and accountant/Reports.tsx's aggregations exactly — same metrics, same
 * 8-month trailing window, same month-bucketing algorithm (carry the last
 * known balance forward into months with no activity).
 *
 * <p>One honest gap ported faithfully, not invented: the frontend never
 * actually creates any 'interest-income' or 'insurance-fee' typed ledger
 * transaction anywhere in data-store.ts, so totalInterestIncome and
 * totalInsuranceCollected are always zero in the current system — this is a
 * real gap in the source of truth (there's no established business rule yet
 * for exactly when interest/insurance revenue should be recognized: upfront
 * at disbursement, amortized per installment, or at completion), not
 * something to silently invent here. These aggregates are computed
 * correctly from whatever ledger data exists; they'll show real numbers
 * once a future phase decides that recognition point and starts writing
 * those rows.
 */
@Service
public class ReportingService {

    private static final int TRAILING_MONTHS = 8;
    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("MMM yy", Locale.ENGLISH);

    private static final Set<LedgerTxType> CASH_IN_TYPES = Set.of(
            LedgerTxType.SALARY_DEDUCTION, LedgerTxType.VOLUNTARY, LedgerTxType.SHARE_PURCHASE,
            LedgerTxType.LOAN_REPAYMENT, LedgerTxType.INSURANCE_FEE, LedgerTxType.INTEREST_INCOME);

    private final SavingsTransactionRepository savingsTransactionRepository;
    private final LedgerTransactionRepository ledgerTransactionRepository;
    private final LoanRepository loanRepository;
    private final MemberRepository memberRepository;
    private final ShareHoldingRepository shareHoldingRepository;
    private final OrganizationRepository organizationRepository;

    public ReportingService(
            SavingsTransactionRepository savingsTransactionRepository,
            LedgerTransactionRepository ledgerTransactionRepository,
            LoanRepository loanRepository,
            MemberRepository memberRepository,
            ShareHoldingRepository shareHoldingRepository,
            OrganizationRepository organizationRepository) {
        this.savingsTransactionRepository = savingsTransactionRepository;
        this.ledgerTransactionRepository = ledgerTransactionRepository;
        this.loanRepository = loanRepository;
        this.memberRepository = memberRepository;
        this.shareHoldingRepository = shareHoldingRepository;
        this.organizationRepository = organizationRepository;
    }

    @Transactional(readOnly = true)
    public AccountantDashboardDto accountantDashboard(UUID organizationId) {
        List<YearMonth> months = lastMonths(TRAILING_MONTHS);
        YearMonth currentMonth = months.get(months.size() - 1);

        List<SavingsTransaction> savingsTx = savingsTransactionRepository
                .findAllByOrganizationIdOrderByCreatedAtAsc(organizationId);
        List<LedgerTransaction> ledgerTx = ledgerTransactionRepository
                .findAllByOrganizationIdOrderByOccurredOnAsc(organizationId);

        BigDecimal totalOrgSavings = savingsTransactionRepository.sumCurrentBalances(organizationId);
        long memberCount = memberRepository.countByOrganizationId(organizationId);
        BigDecimal activeLoanPortfolio = loanRepository.sumRemainingBalanceByStatuses(
                organizationId, List.of(LoanStatus.DISBURSED, LoanStatus.REPAYING));
        BigDecimal totalInterestIncome = ledgerTransactionRepository
                .sumByType(organizationId, LedgerTxType.INTEREST_INCOME);

        BigDecimal thisMonthContributions = savingsTx.stream()
                .filter(tx -> tx.getType() != SavingsTxType.LOAN_REPAYMENT)
                .filter(tx -> YearMonth.from(tx.getOccurredOn()).equals(currentMonth))
                .map(SavingsTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<MonthPoint> savingsGrowth = savingsGrowthByMonth(savingsTx, months);
        List<CashFlowPoint> cashFlow = cashFlowByMonth(ledgerTx, months);

        long totalShares = shareHoldingRepository.sumTotalSharesByOrganizationId(organizationId);
        Organization organization = organizationRepository.findById(organizationId).orElseThrow();
        BigDecimal totalSharesValueRwf = organization.getShareValueRwf().multiply(BigDecimal.valueOf(totalShares));

        return new AccountantDashboardDto(
                totalOrgSavings, memberCount, activeLoanPortfolio, thisMonthContributions,
                currentMonth.format(MONTH_LABEL), totalInterestIncome, savingsGrowth, cashFlow,
                totalSharesValueRwf);
    }

    @Transactional(readOnly = true)
    public FinancialReportDto financialReport(UUID organizationId) {
        List<YearMonth> months = lastMonths(TRAILING_MONTHS);

        BigDecimal totalSavings = savingsTransactionRepository.sumCurrentBalances(organizationId);
        BigDecimal totalLoanPortfolio = loanRepository.sumRemainingBalanceByStatuses(
                organizationId, List.of(LoanStatus.DISBURSED, LoanStatus.REPAYING));
        BigDecimal totalInterestIncome = ledgerTransactionRepository
                .sumByType(organizationId, LedgerTxType.INTEREST_INCOME);
        BigDecimal totalInsuranceCollected = ledgerTransactionRepository
                .sumByType(organizationId, LedgerTxType.INSURANCE_FEE);

        List<LoanStatusSlice> portfolioByStatus = loanRepository.countByStatus(organizationId).stream()
                .map(sc -> new LoanStatusSlice(sc.status().toValue(), sc.count()))
                .toList();

        List<LedgerTransaction> ledgerTx = ledgerTransactionRepository
                .findAllByOrganizationIdOrderByOccurredOnAsc(organizationId);
        List<MonthPoint> interestTrend = months.stream()
                .map(m -> new MonthPoint(m.format(MONTH_LABEL), sumLedgerForMonth(ledgerTx, m, LedgerTxType.INTEREST_INCOME)))
                .toList();

        List<SavingsTransaction> savingsTx = savingsTransactionRepository
                .findAllByOrganizationIdOrderByCreatedAtAsc(organizationId);
        List<MonthPoint> contributionsTrend = months.stream()
                .map(m -> new MonthPoint(m.format(MONTH_LABEL), sumContributionsForMonth(savingsTx, m)))
                .toList();

        return new FinancialReportDto(totalSavings, totalLoanPortfolio, totalInterestIncome,
                totalInsuranceCollected, portfolioByStatus, interestTrend, contributionsTrend);
    }

    /**
     * Aggregate organization savings balance as of the end of each trailing
     * month — for every member, carries their last known balance forward
     * into months with no activity, then sums across members. Same
     * algorithm as Dashboard.tsx's savingsGrowth.
     */
    private List<MonthPoint> savingsGrowthByMonth(List<SavingsTransaction> savingsTx, List<YearMonth> months) {
        Map<UUID, List<SavingsTransaction>> byMember = savingsTx.stream()
                .collect(Collectors.groupingBy(SavingsTransaction::getMemberId));

        BigDecimal[] totals = new BigDecimal[months.size()];
        for (int i = 0; i < totals.length; i++) {
            totals[i] = BigDecimal.ZERO;
        }

        for (List<SavingsTransaction> memberTx : byMember.values()) {
            int idx = 0;
            BigDecimal runningBalance = BigDecimal.ZERO;
            for (int m = 0; m < months.size(); m++) {
                LocalDate endOfMonth = months.get(m).atEndOfMonth();
                while (idx < memberTx.size() && !memberTx.get(idx).getOccurredOn().isAfter(endOfMonth)) {
                    runningBalance = memberTx.get(idx).getBalanceAfter();
                    idx++;
                }
                totals[m] = totals[m].add(runningBalance);
            }
        }

        List<MonthPoint> points = new ArrayList<>(months.size());
        for (int i = 0; i < months.size(); i++) {
            points.add(new MonthPoint(months.get(i).format(MONTH_LABEL), totals[i]));
        }
        return points;
    }

    private List<CashFlowPoint> cashFlowByMonth(List<LedgerTransaction> ledgerTx, List<YearMonth> months) {
        return months.stream()
                .map(m -> {
                    BigDecimal in = ledgerTx.stream()
                            .filter(t -> YearMonth.from(t.getOccurredOn()).equals(m))
                            .filter(t -> CASH_IN_TYPES.contains(t.getType()))
                            .map(LedgerTransaction::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal out = ledgerTx.stream()
                            .filter(t -> YearMonth.from(t.getOccurredOn()).equals(m))
                            .filter(t -> t.getType() == LedgerTxType.LOAN_DISBURSEMENT_ADJUSTMENT)
                            .map(LedgerTransaction::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    return new CashFlowPoint(m.format(MONTH_LABEL), in, out);
                })
                .toList();
    }

    private BigDecimal sumLedgerForMonth(List<LedgerTransaction> ledgerTx, YearMonth month, LedgerTxType type) {
        return ledgerTx.stream()
                .filter(t -> t.getType() == type && YearMonth.from(t.getOccurredOn()).equals(month))
                .map(LedgerTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumContributionsForMonth(List<SavingsTransaction> savingsTx, YearMonth month) {
        return savingsTx.stream()
                .filter(tx -> tx.getType() != SavingsTxType.LOAN_REPAYMENT)
                .filter(tx -> YearMonth.from(tx.getOccurredOn()).equals(month))
                .map(SavingsTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static List<YearMonth> lastMonths(int count) {
        YearMonth current = YearMonth.now();
        List<YearMonth> months = new ArrayList<>(count);
        for (int i = count - 1; i >= 0; i--) {
            months.add(current.minusMonths(i));
        }
        return months;
    }
}
