package rw.ikiminaconnect.member;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

public record CreateMemberRequest(
        @NotBlank String nationalId,
        @NotBlank String employeeId,
        @NotBlank String fullName,
        @NotBlank @Email String email,
        @NotBlank String phone,
        String department,
        String position,
        @PositiveOrZero BigDecimal monthlySalaryRwf) {
}
