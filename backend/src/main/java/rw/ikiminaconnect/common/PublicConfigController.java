package rw.ikiminaconnect.common;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public, non-secret settings the frontend needs before or without login. */
@RestController
@RequestMapping("/api/v1/config")
public class PublicConfigController {

    private final PaymentsMode paymentsMode;

    public PublicConfigController(PaymentsMode paymentsMode) {
        this.paymentsMode = paymentsMode;
    }

    @GetMapping
    public Map<String, String> config() {
        return Map.of("paymentsMode", paymentsMode.value());
    }
}
