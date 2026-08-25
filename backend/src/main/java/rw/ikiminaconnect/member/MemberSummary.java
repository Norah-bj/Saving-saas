package rw.ikiminaconnect.member;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record MemberSummary(
        UUID id,
        String nationalId,
        String employeeId,
        String fullName,
        String department,
        String position,
        String status,
        LocalDate dateJoined,
        BigDecimal savingsBalanceRwf,
        List<String> roles) {
}
