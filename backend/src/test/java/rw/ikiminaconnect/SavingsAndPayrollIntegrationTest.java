package rw.ikiminaconnect;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import rw.ikiminaconnect.support.IntegrationTestBase;

/** Payroll Excel import outcomes and share purchase/withdrawal money movement. */
class SavingsAndPayrollIntegrationTest extends IntegrationTestBase {

    @Test
    void payrollImportClassifiesEveryRowAndCreditsOnlyMatchedOnes() throws Exception {
        Org org = registerVerifiedOrg();
        setRoles(org, org.adminId(), List.of("org-admin", "member", "hr"));
        String hr = login(org.adminEmail(), PASSWORD);
        Member alice = createMember(org, "Alice");
        Member bob = createMember(org, "Bob");

        byte[] workbook = payrollWorkbook(new Object[][] {
                {alice.employeeId(), 15000},   // matched
                {alice.employeeId(), 15000},   // duplicate of the row above
                {"NOBODY-123", 5000},          // unknown employee
                {bob.employeeId(), 0},         // invalid amount
        });

        Response result = upload("/payroll/import", hr, "payroll-june.xlsx", workbook);

        assertStatus(result, 201);
        JsonNode summary = result.body().get("summary");
        assertThat(summary.get("totalRecords").asInt()).isEqualTo(4);
        assertThat(summary.get("successful").asInt()).isEqualTo(1);
        assertThat(summary.get("duplicates").asInt()).isEqualTo(1);
        assertThat(summary.get("failed").asInt()).isEqualTo(2);
        assertThat(balance(alice)).isEqualByComparingTo("15000");
        assertThat(balance(bob)).isEqualByComparingTo("0");
    }

    @Test
    void payrollImportRejectsNonExcelFiles() throws Exception {
        Org org = registerVerifiedOrg();
        setRoles(org, org.adminId(), List.of("org-admin", "member", "hr"));
        String hr = login(org.adminEmail(), PASSWORD);

        Response csv = upload("/payroll/import", hr, "payroll.csv", "Employee ID,Saving Amount\nX,1".getBytes(StandardCharsets.UTF_8));
        Response corrupt = upload("/payroll/import", hr, "payroll.xlsx", "not really a workbook".getBytes(StandardCharsets.UTF_8));

        assertThat(csv.status()).isEqualTo(400);
        assertThat(corrupt.status()).isEqualTo(400);
    }

    @Test
    void approvedShareWithdrawalMovesSharesAndMoney() throws Exception {
        Org org = registerVerifiedOrg();
        Member member = createMember(org, "Shareholder");
        String path = "/members/" + member.id();

        Response bought = postJson(path + "/shares/buy", member.token(), Map.of("shares", 3));
        assertStatus(bought, 201);
        BigDecimal shareValue = bought.body().get("shareValueRwf").decimalValue();
        BigDecimal balanceAfterPurchase = balance(member);
        assertThat(bought.body().get("totalShares").asInt()).isEqualTo(3);

        // Can't withdraw more shares than held.
        assertThat(postJson("/share-withdrawals", member.token(), Map.of("shares", 5)).status()).isEqualTo(409);

        Response requested = postJson("/share-withdrawals", member.token(), Map.of("shares", 2));
        assertStatus(requested, 201);
        String requestId = requested.body().get("id").asText();

        // A plain member can't approve their own request.
        assertThat(postJson("/share-withdrawals/" + requestId + "/decision", member.token(),
                Map.of("decision", "approve")).status()).isEqualTo(403);
        Response approved = postJson("/share-withdrawals/" + requestId + "/decision", org.adminToken(),
                Map.of("decision", "approve"));
        assertStatus(approved, 200);
        assertThat(approved.body().get("status").asText()).isEqualTo("approved");

        JsonNode detail = getJson(path, org.adminToken()).body();
        assertThat(detail.get("totalShares").asInt()).isEqualTo(1);
        assertThat(balance(member)).isEqualByComparingTo(balanceAfterPurchase.subtract(shareValue.multiply(BigDecimal.valueOf(2))));

        // Deciding twice is refused.
        assertThat(postJson("/share-withdrawals/" + requestId + "/decision", org.adminToken(),
                Map.of("decision", "approve")).status()).isEqualTo(409);
    }

    private BigDecimal balance(Member member) throws Exception {
        Response ledger = getJson("/members/" + member.id() + "/savings-ledger", member.token());
        assertStatus(ledger, 200);
        return ledger.body().get("currentBalanceRwf").decimalValue();
    }

    private static byte[] payrollWorkbook(Object[][] rows) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Payroll");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Employee ID");
            header.createCell(1).setCellValue("Saving Amount");
            for (int i = 0; i < rows.length; i++) {
                Row row = sheet.createRow(i + 1);
                row.createCell(0).setCellValue((String) rows[i][0]);
                row.createCell(1).setCellValue(((Number) rows[i][1]).doubleValue());
            }
            workbook.write(out);
            return out.toByteArray();
        }
    }
}
