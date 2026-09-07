package rw.ikiminaconnect.payroll;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Component;
import rw.ikiminaconnect.common.BadRequestException;

/**
 * Server-side replacement for the frontend's client-side SheetJS parsing
 * (that was always a demo stand-in — see BACKEND_CONTRACT.md). Mirrors its
 * exact header-matching behavior: first sheet, first row is headers,
 * case-insensitive/trimmed match against "Employee ID"/"EmployeeId" and
 * "Saving Amount"/"Amount". A row with a missing column value gets an empty
 * employeeId / zero amount, same as the frontend's `pick(...) ?? default` —
 * validation of THAT is the business rules in PayrollImportService, not a
 * parse-time error. The only parse-time error is a genuinely empty sheet.
 */
@Component
public class PayrollFileParser {

    private static final List<String> EMPLOYEE_ID_HEADERS = List.of("employee id", "employeeid");
    private static final List<String> AMOUNT_HEADERS = List.of("saving amount", "amount");

    public List<PayrollFileRow> parse(InputStream inputStream) {
        return parse(inputStream, null);
    }

    /**
     * {@code originalFilename} is checked against the two extensions POI's
     * {@code WorkbookFactory} actually supports here, before ever touching
     * the file content — a clear "wrong file type" message instead of
     * whatever cryptic exception POI happens to throw for, say, a renamed
     * .csv or .pdf (a real gap: previously only a raw IOException was
     * caught, so a corrupt/encrypted/wrong-format file could surface as an
     * unhandled 500 — see docs/CHANGELOG.md, gap-closure phase 5).
     */
    public List<PayrollFileRow> parse(InputStream inputStream, String originalFilename) {
        if (originalFilename != null) {
            String lower = originalFilename.toLowerCase(Locale.ROOT);
            if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
                throw new BadRequestException("Please upload an Excel file (.xlsx or .xls) — \""
                        + originalFilename + "\" doesn't look like one.");
            }
        }
        try (Workbook workbook = WorkbookFactory.create(inputStream)) {
            Sheet sheet = workbook.getSheetAt(0);
            var rowIterator = sheet.iterator();
            if (!rowIterator.hasNext()) {
                throw emptySheetError();
            }

            Row headerRow = rowIterator.next();
            Map<String, Integer> columnIndex = new LinkedHashMap<>();
            for (Cell cell : headerRow) {
                String header = cellText(cell).trim().toLowerCase(Locale.ROOT);
                if (!header.isEmpty()) {
                    columnIndex.putIfAbsent(header, cell.getColumnIndex());
                }
            }
            int employeeIdCol = firstMatch(columnIndex, EMPLOYEE_ID_HEADERS);
            int amountCol = firstMatch(columnIndex, AMOUNT_HEADERS);

            List<PayrollFileRow> rows = new ArrayList<>();
            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                String employeeId = employeeIdCol < 0 ? "" : cellText(row.getCell(employeeIdCol)).trim();
                BigDecimal amount = amountCol < 0 ? BigDecimal.ZERO : cellAmount(row.getCell(amountCol));
                if (employeeId.isEmpty() && amount.signum() == 0 && isRowBlank(row)) {
                    continue; // skip fully blank trailing rows
                }
                rows.add(new PayrollFileRow(employeeId, amount));
            }

            if (rows.isEmpty()) {
                throw emptySheetError();
            }
            return rows;
        } catch (BadRequestException e) {
            throw e; // our own intentional "no rows found" — don't re-wrap it below
        } catch (IOException | RuntimeException e) {
            // Broadened beyond IOException — POI throws various unchecked
            // exceptions for encrypted (EncryptedDocumentException) or
            // otherwise malformed workbooks, which previously surfaced as an
            // unhandled 500 instead of a clear "bad file" message.
            throw new BadRequestException(
                    "Couldn't read this file. Make sure it's a valid, unprotected .xlsx or .xls file.");
        }
    }

    private static BadRequestException emptySheetError() {
        return new BadRequestException(
                "No rows found. Make sure the sheet has an 'Employee ID' and 'Saving Amount' column.");
    }

    private static int firstMatch(Map<String, Integer> columnIndex, List<String> candidates) {
        for (String candidate : candidates) {
            Integer index = columnIndex.get(candidate);
            if (index != null) {
                return index;
            }
        }
        return -1;
    }

    private static boolean isRowBlank(Row row) {
        for (Cell cell : row) {
            if (!cellText(cell).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private static String cellText(Cell cell) {
        if (cell == null) {
            return "";
        }
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                double value = cell.getNumericCellValue();
                yield value == Math.floor(value) ? String.valueOf((long) value) : String.valueOf(value);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> cell.getCellFormula();
            default -> "";
        };
    }

    private static BigDecimal cellAmount(Cell cell) {
        if (cell == null) {
            return BigDecimal.ZERO;
        }
        return switch (cell.getCellType()) {
            case NUMERIC -> BigDecimal.valueOf(cell.getNumericCellValue());
            case STRING -> {
                try {
                    yield new BigDecimal(cell.getStringCellValue().trim());
                } catch (NumberFormatException e) {
                    yield BigDecimal.ZERO;
                }
            }
            default -> BigDecimal.ZERO;
        };
    }
}
