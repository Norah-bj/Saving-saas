package rw.ikiminaconnect;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import rw.ikiminaconnect.support.IntegrationTestBase;

/**
 * The full guaranteed-loan lifecycle through the real API: apply → review →
 * guarantor accepts → chair approves → contract → disburse (with revenue
 * ledger rows) → repay every installment → completed, guarantee released.
 */
class LoanLifecycleIntegrationTest extends IntegrationTestBase {

    private static final BigDecimal LOAN_AMOUNT = new BigDecimal("60000");
    private static final BigDecimal INSURANCE_RATE = new BigDecimal("0.01");

    @Test
    void guaranteedLoanGoesFromApplicationToFullRepayment() throws Exception {
        Org org = registerVerifiedOrg();
        // The admin also acts as committee chair and accountant in this small org.
        setRoles(org, org.adminId(), List.of("org-admin", "member", "loan-committee", "accountant"));
        assertStatus(putJson("/members/" + org.adminId() + "/committee-chair", org.adminToken(), Map.of("chair", true)), 200);
        String staff = login(org.adminEmail(), PASSWORD); // roles + chair flag live in the JWT

        // New members have 0 months' tenure, so allow loans immediately for this test.
        assertStatus(patchJson("/organizations/" + org.id() + "/loan-policy", staff, Map.of(
                "loanInterestRate", 0.05,
                "loanInsuranceRate", INSURANCE_RATE,
                "minMonthsBeforeEligible", 0,
                "allowedRepaymentPeriods", List.of(3, 6))), 200);

        Member borrower = createMember(org, "Borrower");
        Member guarantor = createMember(org, "Guarantor");
        assertStatus(postJson("/members/" + borrower.id() + "/savings/voluntary", borrower.token(),
                Map.of("amountRwf", 20000, "source", "cash")), 201);

        // Amount exceeds savings, so a guarantor is mandatory.
        Response noGuarantor = postJson("/loans", borrower.token(),
                Map.of("amount", LOAN_AMOUNT, "purpose", "School fees", "periodMonths", 3));
        assertThat(noGuarantor.status()).isEqualTo(400);

        Response applied = postJson("/loans", borrower.token(), Map.of(
                "amount", LOAN_AMOUNT, "purpose", "School fees", "periodMonths", 3,
                "guarantorId", guarantor.id()));
        assertStatus(applied, 201);
        String loanId = applied.body().get("id").asText();
        assertThat(applied.body().get("status").asText()).isEqualTo("submitted");

        assertThat(status(postJson("/loans/" + loanId + "/start-review", staff, null))).isEqualTo("guarantor-approval");

        // Only the named guarantor may respond.
        JsonNode guarantee = findGuarantee(guarantor.token(), loanId);
        String respondPath = "/guarantees/" + guarantee.get("id").asText() + "/respond";
        assertThat(postJson(respondPath, borrower.token(), Map.of("accept", true)).status()).isEqualTo(403);
        assertStatus(postJson(respondPath, guarantor.token(), Map.of("accept", true)), 200);
        assertThat(status(getJson("/loans/" + loanId, staff))).isEqualTo("committee-review");

        // A borrower can't approve their own loan.
        assertThat(postJson("/loans/" + loanId + "/committee-decision", borrower.token(),
                Map.of("approve", true)).status()).isEqualTo(403);
        assertThat(status(postJson("/loans/" + loanId + "/committee-decision", staff,
                Map.of("approve", true, "notes", "Guarantor and savings history are fine.")))).isEqualTo("approved");

        // Disbursing before a contract exists is refused.
        assertThat(postJson("/loans/" + loanId + "/disburse", staff, null).status()).isEqualTo(409);
        assertThat(status(postJson("/loans/" + loanId + "/generate-contract", staff, null))).isEqualTo("contract-generated");
        assertThat(getJson("/loans/" + loanId + "/contract", borrower.token()).status()).isEqualTo(200);

        Response disbursed = postJson("/loans/" + loanId + "/disburse", staff, null);
        assertThat(status(disbursed)).isEqualTo("disbursed");

        // Revenue is recognized at disbursement: interest + insurance ledger rows that reconcile with the loan.
        JsonNode loan = disbursed.body();
        BigDecimal insuranceFee = loan.get("insuranceFee").decimalValue();
        BigDecimal expectedInterest = loan.get("totalPayable").decimalValue().subtract(LOAN_AMOUNT).subtract(insuranceFee);
        assertThat(insuranceFee).isEqualByComparingTo(LOAN_AMOUNT.multiply(INSURANCE_RATE));
        assertThat(ledgerTotal(staff, borrower, "interest-income")).isEqualByComparingTo(expectedInterest);
        assertThat(ledgerTotal(staff, borrower, "insurance-fee")).isEqualByComparingTo(insuranceFee);

        // Repay installment by installment until the loan closes.
        String finalStatus = "disbursed";
        for (int i = 0; i < 12 && !finalStatus.equals("completed"); i++) {
            finalStatus = status(postJson("/loans/" + loanId + "/record-repayment", staff, null));
        }
        JsonNode completed = getJson("/loans/" + loanId, staff).body();
        assertThat(completed.get("status").asText()).isEqualTo("completed");
        assertThat(completed.get("remainingBalance").decimalValue()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(postJson("/loans/" + loanId + "/record-repayment", staff, null).status()).isEqualTo(409);
        assertThat(findGuarantee(guarantor.token(), loanId).get("status").asText()).isEqualTo("released");

        assertThat(notificationTitles(borrower.token()))
                .contains("Loan approved", "Loan disbursed", "Loan fully repaid");
        assertThat(notificationTitles(guarantor.token())).contains("You've been requested as a guarantor");
    }

    private static String status(Response response) {
        assertStatus(response, 200);
        return response.body().get("status").asText();
    }

    private JsonNode findGuarantee(String guarantorToken, String loanId) throws Exception {
        for (JsonNode guarantee : getJson("/guarantees", guarantorToken).body()) {
            if (guarantee.get("loanId").asText().equals(loanId)) {
                return guarantee;
            }
        }
        throw new AssertionError("No guarantee found for loan " + loanId);
    }

    private BigDecimal ledgerTotal(String token, Member member, String type) throws Exception {
        Response response = getJson("/ledger?size=500&type=" + type + "&memberId=" + member.id(), token);
        assertStatus(response, 200);
        BigDecimal total = BigDecimal.ZERO;
        for (JsonNode row : response.body().get("content")) {
            total = total.add(row.get("amount").decimalValue());
        }
        return total;
    }

    private List<String> notificationTitles(String token) throws Exception {
        Response response = getJson("/notifications", token);
        assertStatus(response, 200);
        JsonNode rows = response.body().has("content") ? response.body().get("content") : response.body();
        List<String> titles = new ArrayList<>();
        rows.forEach(n -> titles.add(n.get("title").asText()));
        return titles;
    }
}
