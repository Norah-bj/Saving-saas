package rw.ikiminaconnect.member;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record MemberDetail(
        UUID id,
        UUID organizationId,
        String nationalId,
        String employeeId,
        String fullName,
        String email,
        String phone,
        String department,
        String position,
        String status,
        LocalDate dateJoined,
        BigDecimal monthlySalaryRwf,
        List<String> roles,
        boolean committeeChair,
        BigDecimal savingsBalanceRwf,
        int totalShares) {
}
