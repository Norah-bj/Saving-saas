package rw.ikiminaconnect.member;

import static rw.ikiminaconnect.common.ValidationRules.*;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CreateMemberRequest(
        @NotBlank @Pattern(regexp = NATIONAL_ID, message = NATIONAL_ID_MESSAGE) String nationalId,
        @NotBlank @Pattern(regexp = EMPLOYEE_ID, message = EMPLOYEE_ID_MESSAGE) String employeeId,
        @NotBlank @Size(min = 2, max = 120) String fullName,
        @NotBlank @Email @Size(max = 160) String email,
        @NotBlank @Pattern(regexp = PHONE, message = PHONE_MESSAGE) String phone,
        @Size(max = 80) String department,
        @Size(max = 80) String position,
        @PositiveOrZero @DecimalMax(value = "100000000", message = "Salary looks too high — check the amount.")
        BigDecimal monthlySalaryRwf) {
}
