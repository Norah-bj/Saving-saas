package rw.ikiminaconnect.policy;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * The same 8 default policy documents V9__policy_documents.sql seeded for
 * every organization that existed at migration time — kept here, in Java,
 * so a newly self-registered organization (AuthService.register()) gets the
 * identical starting set without going back to the database for a copy.
 */
public final class PolicyDocumentSeeder {

    private PolicyDocumentSeeder() {
    }

    public static List<PolicyDocument> defaults(UUID organizationId) {
        return List.of(
                new PolicyDocument(organizationId, PolicyCategory.membership, "Membership Policy",
                        "Eligibility, registration, and identity verification requirements for new members.",
                        List.of(
                                "Membership is open to all confirmed employees of the district and its affiliated institutions.",
                                "Registration requires a valid National ID and Employee ID verified against the district's employee registry.",
                                "The National ID is the member's unique identifier across the platform; the Employee ID remains unique within the organization.",
                                "New members must complete a Membership Application Form, countersigned by the Secretary."),
                        LocalDate.of(2025, 11, 2)),
                new PolicyDocument(organizationId, PolicyCategory.savings, "Savings Policy",
                        "How monthly, voluntary, and payroll-deducted savings are collected and recorded.",
                        List.of(
                                "Monthly savings are deducted directly from salary through the district's HR payroll system and imported by the Accountant each month.",
                                "Members may additionally make voluntary savings deposits at any time.",
                                "All savings are recorded in the member's Savings Statement with a running balance, similar to a bank statement.",
                                "Savings withdrawals are only permitted upon exit from the cooperative, subject to Organization Admin approval."),
                        LocalDate.of(2025, 11, 2)),
                new PolicyDocument(organizationId, PolicyCategory.shares, "Shares Policy",
                        "Share pricing, purchases, and withdrawal rules.",
                        List.of(
                                "Each share is valued at 5,000 RWF.",
                                "Every member holds a minimum of 5 founding shares upon registration.",
                                "Additional shares may be purchased at any time in whole-share increments.",
                                "Share withdrawal requests are reviewed by the Organization Admin and are subject to available cooperative liquidity."),
                        LocalDate.of(2025, 11, 2)),
                new PolicyDocument(organizationId, PolicyCategory.loan, "Loan Policy",
                        "Interest, insurance, eligibility, and repayment rules.",
                        List.of(
                                "Members become eligible for a loan after a minimum of three months of continuous savings.",
                                "Standard interest is 5% of the requested loan amount, applied once over the loan period.",
                                "A 1% insurance fee applies only when the requested amount exceeds the member's total savings — this is exactly when a guarantor is required.",
                                "If the requested amount is within the member's savings, no guarantor and no insurance fee are required.",
                                "Repayment is deducted automatically from salary every month through HR payroll; there are no late-payment penalties since repayment is salary-based.",
                                "Loan applications pass through: Submitted -> Under Review -> Guarantor Approval (if required) -> Committee Review -> Approved -> Contract Generated -> Disbursed -> Repaying -> Completed."),
                        LocalDate.of(2026, 1, 20)),
                new PolicyDocument(organizationId, PolicyCategory.guarantor, "Guarantor Policy",
                        "Rules governing who can guarantee a loan and their obligations.",
                        List.of(
                                "A guarantor must be an active member in good standing.",
                                "A member actively guaranteeing another member's loan cannot apply for a new loan of their own until that guarantee is released.",
                                "Guarantors are notified of the outstanding balance and status of loans they have guaranteed at all times.",
                                "If a borrower defaults, the guarantor's savings may be used to cover the outstanding balance, subject to Loan Committee review."),
                        LocalDate.of(2025, 11, 2)),
                new PolicyDocument(organizationId, PolicyCategory.suspension, "Suspension Policy",
                        "Grounds and process for suspending a member.",
                        List.of(
                                "Members may be suspended by the Organization Admin for repeated missed contributions, fraudulent activity, or violation of the cooperative constitution.",
                                "Suspended members retain visibility of their savings and loan history but cannot apply for new loans, purchase shares, or vote at meetings.",
                                "Suspension decisions may be appealed to the Board within 30 days."),
                        LocalDate.of(2025, 9, 10)),
                new PolicyDocument(organizationId, PolicyCategory.exit, "Exit Policy",
                        "How members formally leave the cooperative and settle balances.",
                        List.of(
                                "Members wishing to exit must submit a Membership Exit Request to the Secretary.",
                                "All outstanding loan balances must be settled, or a repayment arrangement approved, before exit is finalized.",
                                "Savings and share value are refunded within 30 days of an approved exit request."),
                        LocalDate.of(2025, 9, 10)),
                new PolicyDocument(organizationId, PolicyCategory.privacy, "Privacy Policy",
                        "How member data is collected, used, and protected.",
                        List.of(
                                "Member financial data is only accessible to the member themselves and authorized organization officers (Secretary, Accountant, Loan Committee, Organization Admin) strictly for cooperative operations.",
                                "Data is never shared with third parties without member consent, except where required by Rwandan law.",
                                "Each organization's data is logically isolated from other organizations on the platform."),
                        LocalDate.of(2025, 9, 10)));
    }
}
