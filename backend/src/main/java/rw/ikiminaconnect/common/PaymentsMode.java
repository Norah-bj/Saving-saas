package rw.ikiminaconnect.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * There is no real payment provider yet (no MTN MoMo / Airtel Money
 * integration), so a member "depositing" or "buying shares" from their own
 * dashboard moves no real money. {@code app.payments.mode} makes that
 * explicit:
 *
 * <ul>
 *   <li>{@code demo} (local default): member self-service is allowed for
 *       testing, recorded with the source "Demo (no real payment)", and the
 *       frontend shows a demo banner.</li>
 *   <li>{@code disabled} (production default): members can't add money
 *       themselves; staff still record cash or bank payments they actually
 *       received.</li>
 * </ul>
 *
 * A future {@code mobile-money} mode would only credit the ledger once the
 * provider confirms the payment — see docs/DECISIONS.md.
 */
@Component
public class PaymentsMode {

    public static final String DEMO_SOURCE = "Demo (no real payment)";

    private final String mode;

    public PaymentsMode(@Value("${app.payments.mode:demo}") String mode) {
        this.mode = mode.trim().toLowerCase();
    }

    public String value() {
        return mode;
    }

    public boolean isDemo() {
        return "demo".equals(mode);
    }

    /** Throws 403 unless members may currently put money in from their own dashboard. */
    public void requireSelfServiceAllowed() {
        if (!isDemo()) {
            throw new ForbiddenException("Online payments aren't available yet. Pay at your cooperative's office "
                    + "and the accountant will record it.");
        }
    }
}
