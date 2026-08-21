package rw.ikiminaconnect.auth;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record MeResponse(
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
        List<String> roles,
        boolean committeeChair,
        BigDecimal monthlySalaryRwf) {
}
