package rw.ikiminaconnect.payroll;

import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import rw.ikiminaconnect.common.PageResponse;
import rw.ikiminaconnect.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/payroll")
@PreAuthorize("hasAnyRole('HR','ACCOUNTANT')")
public class PayrollController {

    private final PayrollImportService payrollImportService;

    public PayrollController(PayrollImportService payrollImportService) {
        this.payrollImportService = payrollImportService;
    }

    @PostMapping(value = "/import", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public PayrollImportResult importFile(
            @AuthenticationPrincipal CurrentUser currentUser,
            @RequestParam("file") MultipartFile file) {
        return payrollImportService.importFile(
                currentUser.organizationId(), file, currentUser.userId(), currentUser.fullName());
    }

    @GetMapping("/imports")
    public PageResponse<PayrollImportSummaryDto> list(
            @AuthenticationPrincipal CurrentUser currentUser, Pageable pageable) {
        return PageResponse.from(payrollImportService.list(currentUser.organizationId(), pageable));
    }

    @GetMapping("/imports/{id}")
    public PayrollImportResult get(@AuthenticationPrincipal CurrentUser currentUser, @PathVariable UUID id) {
        return payrollImportService.get(currentUser.organizationId(), id);
    }
}
