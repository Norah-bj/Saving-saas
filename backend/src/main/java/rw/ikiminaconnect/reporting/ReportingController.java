package rw.ikiminaconnect.reporting;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rw.ikiminaconnect.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/reports")
@PreAuthorize("hasAnyRole('ACCOUNTANT','ORG_ADMIN')")
public class ReportingController {

    private final ReportingService reportingService;

    public ReportingController(ReportingService reportingService) {
        this.reportingService = reportingService;
    }

    @GetMapping("/accountant-dashboard")
    public AccountantDashboardDto accountantDashboard(@AuthenticationPrincipal CurrentUser currentUser) {
        return reportingService.accountantDashboard(currentUser.organizationId());
    }

    @GetMapping("/financial")
    public FinancialReportDto financial(@AuthenticationPrincipal CurrentUser currentUser) {
        return reportingService.financialReport(currentUser.organizationId());
    }
}
