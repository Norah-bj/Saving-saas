package rw.ikiminaconnect.loan;

/** One row of a GROUP BY status count — see LoanRepository.countByStatus. */
public record LoanStatusCount(LoanStatus status, long count) {
}
