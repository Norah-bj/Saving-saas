package rw.ikiminaconnect.common;

/**
 * Field formats shared by every request DTO, so the API enforces the same
 * rules as the frontend forms (src/lib/validation.ts mirrors these — keep
 * them in step).
 */
public final class ValidationRules {

    private ValidationRules() {
    }

    /** At least 8 characters with at least one letter and one number (max 128). */
    public static final String PASSWORD = "^(?=.*[A-Za-z])(?=.*\\d).{8,128}$";
    public static final String PASSWORD_MESSAGE =
            "Password must be at least 8 characters and include at least one letter and one number.";

    /** Rwandan national ID: 16 digits. */
    public static final String NATIONAL_ID = "^\\d{16}$";
    public static final String NATIONAL_ID_MESSAGE = "National ID must be exactly 16 digits.";

    /**
     * Rwandan mobile number: 07X XXX XXXX (MTN 078/079, Airtel 072/073), optionally
     * written +250 7X… or 250 7X…; spaces between digits are allowed.
     */
    public static final String PHONE = "^(\\+?250\\s?|0)7[2389](\\s?\\d){7}$";
    public static final String PHONE_MESSAGE = "Enter a Rwandan mobile number, e.g. 0788 123 456.";

    /** Letters, digits, dash, slash, dot and underscore. */
    public static final String EMPLOYEE_ID = "^[A-Za-z0-9][A-Za-z0-9._/-]{0,39}$";
    public static final String EMPLOYEE_ID_MESSAGE =
            "Employee ID may use letters, numbers, - _ / . (up to 40 characters).";

    /** A #RRGGBB colour. */
    public static final String HEX_COLOR = "^#[0-9A-Fa-f]{6}$";
    public static final String HEX_COLOR_MESSAGE = "Use a colour like #1f6f5c.";
}
