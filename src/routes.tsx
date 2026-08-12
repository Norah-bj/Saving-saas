import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { ProtectedLayout } from "@/components/layout/protected-layout";

const LandingPage = lazy(() => import("@/pages/LandingPage"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const LoanContract = lazy(() => import("@/pages/LoanContract"));
const ExitSettlement = lazy(() => import("@/pages/ExitSettlement"));

// Member
const MemberDashboard = lazy(() => import("@/pages/member/Dashboard"));
const MemberSavings = lazy(() => import("@/pages/member/Savings"));
const MemberSavingsStatement = lazy(() => import("@/pages/member/SavingsStatement"));
const MemberShares = lazy(() => import("@/pages/member/Shares"));
const MemberLoans = lazy(() => import("@/pages/member/Loans"));
const MemberLoanApply = lazy(() => import("@/pages/member/LoanApply"));
const MemberLoanDetail = lazy(() => import("@/pages/member/LoanDetail"));
const MemberGuarantors = lazy(() => import("@/pages/member/Guarantors"));
const MemberMeetings = lazy(() => import("@/pages/member/Meetings"));
const MemberAnnouncements = lazy(() => import("@/pages/member/Announcements"));
const MemberDocuments = lazy(() => import("@/pages/member/Documents"));
const MemberPolicies = lazy(() => import("@/pages/member/Policies"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Profile = lazy(() => import("@/pages/Profile"));

// Secretary
const SecretaryDashboard = lazy(() => import("@/pages/secretary/Dashboard"));
const SecretaryMembers = lazy(() => import("@/pages/secretary/Members"));
const SecretaryExitRequests = lazy(() => import("@/pages/secretary/ExitRequests"));
const SecretarySuspended = lazy(() => import("@/pages/secretary/Suspended"));
const SecretaryMeetings = lazy(() => import("@/pages/secretary/Meetings"));
const SecretaryAnnouncements = lazy(() => import("@/pages/secretary/Announcements"));
const SecretaryDocuments = lazy(() => import("@/pages/secretary/Documents"));

// Accountant
const AccountantDashboard = lazy(() => import("@/pages/accountant/Dashboard"));
const AccountantTransactions = lazy(() => import("@/pages/accountant/Transactions"));
const AccountantStatements = lazy(() => import("@/pages/accountant/Statements"));
const AccountantDisbursement = lazy(() => import("@/pages/accountant/Disbursement"));
const AccountantImport = lazy(() => import("@/pages/accountant/Import"));
const AccountantExports = lazy(() => import("@/pages/accountant/Exports"));
const AccountantReports = lazy(() => import("@/pages/accountant/Reports"));

// Loan Committee
const LoanCommitteeDashboard = lazy(() => import("@/pages/loan-committee/Dashboard"));
const LoanCommitteePending = lazy(() => import("@/pages/loan-committee/Pending"));
const LoanCommitteePendingDetail = lazy(() => import("@/pages/loan-committee/PendingDetail"));
const LoanCommitteeDecisions = lazy(() => import("@/pages/loan-committee/Decisions"));
const LoanCommitteeReports = lazy(() => import("@/pages/loan-committee/Reports"));
const LoanCommitteePolicy = lazy(() => import("@/pages/loan-committee/Policy"));

// HR
const HrDashboard = lazy(() => import("@/pages/hr/Dashboard"));
const HrUpload = lazy(() => import("@/pages/hr/Upload"));
const HrReports = lazy(() => import("@/pages/hr/Reports"));

// Org Admin
const OrgAdminDashboard = lazy(() => import("@/pages/org-admin/Dashboard"));
const OrgAdminUsers = lazy(() => import("@/pages/org-admin/Users"));
const OrgAdminModeration = lazy(() => import("@/pages/org-admin/Moderation"));
const OrgAdminSettings = lazy(() => import("@/pages/org-admin/Settings"));
const OrgAdminBackups = lazy(() => import("@/pages/org-admin/Backups"));
const OrgAdminReports = lazy(() => import("@/pages/org-admin/Reports"));

// Super Admin
const SuperAdminDashboard = lazy(() => import("@/pages/super-admin/Dashboard"));
const SuperAdminOrganizations = lazy(() => import("@/pages/super-admin/Organizations"));
const SuperAdminBilling = lazy(() => import("@/pages/super-admin/Billing"));
const SuperAdminAnalytics = lazy(() => import("@/pages/super-admin/Analytics"));
const SuperAdminAuditLogs = lazy(() => import("@/pages/super-admin/AuditLogs"));
const SuperAdminBackups = lazy(() => import("@/pages/super-admin/Backups"));
const SuperAdminSupport = lazy(() => import("@/pages/super-admin/Support"));
const SuperAdminMonitoring = lazy(() => import("@/pages/super-admin/Monitoring"));
const SuperAdminSettings = lazy(() => import("@/pages/super-admin/Settings"));

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/member/dashboard" element={<MemberDashboard />} />
        <Route path="/member/savings" element={<MemberSavings />} />
        <Route path="/member/savings/statement" element={<MemberSavingsStatement />} />
        <Route path="/member/shares" element={<MemberShares />} />
        <Route path="/member/loans" element={<MemberLoans />} />
        <Route path="/member/loans/apply" element={<MemberLoanApply />} />
        <Route path="/member/loans/:id" element={<MemberLoanDetail />} />
        <Route path="/loans/:id/contract" element={<LoanContract />} />
        <Route path="/members/:id/exit-settlement" element={<ExitSettlement />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/member/guarantors" element={<MemberGuarantors />} />
        <Route path="/member/meetings" element={<MemberMeetings />} />
        <Route path="/member/announcements" element={<MemberAnnouncements />} />
        <Route path="/member/documents" element={<MemberDocuments />} />
        <Route path="/member/policies" element={<MemberPolicies />} />

        <Route path="/secretary/dashboard" element={<SecretaryDashboard />} />
        <Route path="/secretary/members" element={<SecretaryMembers />} />
        <Route path="/secretary/exit-requests" element={<SecretaryExitRequests />} />
        <Route path="/secretary/suspended" element={<SecretarySuspended />} />
        <Route path="/secretary/meetings" element={<SecretaryMeetings />} />
        <Route path="/secretary/announcements" element={<SecretaryAnnouncements />} />
        <Route path="/secretary/documents" element={<SecretaryDocuments />} />

        <Route path="/accountant/dashboard" element={<AccountantDashboard />} />
        <Route path="/accountant/transactions" element={<AccountantTransactions />} />
        <Route path="/accountant/statements" element={<AccountantStatements />} />
        <Route path="/accountant/disbursement" element={<AccountantDisbursement />} />
        <Route path="/accountant/import" element={<AccountantImport />} />
        <Route path="/accountant/exports" element={<AccountantExports />} />
        <Route path="/accountant/reports" element={<AccountantReports />} />

        <Route path="/loan-committee/dashboard" element={<LoanCommitteeDashboard />} />
        <Route path="/loan-committee/pending" element={<LoanCommitteePending />} />
        <Route path="/loan-committee/pending/:id" element={<LoanCommitteePendingDetail />} />
        <Route path="/loan-committee/decisions" element={<LoanCommitteeDecisions />} />
        <Route path="/loan-committee/reports" element={<LoanCommitteeReports />} />
        <Route path="/loan-committee/policy" element={<LoanCommitteePolicy />} />

        <Route path="/hr/dashboard" element={<HrDashboard />} />
        <Route path="/hr/upload" element={<HrUpload />} />
        <Route path="/hr/reports" element={<HrReports />} />

        <Route path="/org-admin/dashboard" element={<OrgAdminDashboard />} />
        <Route path="/org-admin/users" element={<OrgAdminUsers />} />
        <Route path="/org-admin/moderation" element={<OrgAdminModeration />} />
        <Route path="/org-admin/settings" element={<OrgAdminSettings />} />
        <Route path="/org-admin/backups" element={<OrgAdminBackups />} />
        <Route path="/org-admin/reports" element={<OrgAdminReports />} />

        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/organizations" element={<SuperAdminOrganizations />} />
        <Route path="/super-admin/billing" element={<SuperAdminBilling />} />
        <Route path="/super-admin/analytics" element={<SuperAdminAnalytics />} />
        <Route path="/super-admin/audit-logs" element={<SuperAdminAuditLogs />} />
        <Route path="/super-admin/backups" element={<SuperAdminBackups />} />
        <Route path="/super-admin/support" element={<SuperAdminSupport />} />
        <Route path="/super-admin/monitoring" element={<SuperAdminMonitoring />} />
        <Route path="/super-admin/settings" element={<SuperAdminSettings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
