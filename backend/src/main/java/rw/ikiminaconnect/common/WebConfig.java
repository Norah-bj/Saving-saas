package rw.ikiminaconnect.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import rw.ikiminaconnect.ledger.LedgerTxMethod;
import rw.ikiminaconnect.ledger.LedgerTxType;

/**
 * Spring's default enum query-param binding calls {@code Enum.valueOf} directly, bypassing the
 * {@code @JsonCreator fromValue} used everywhere else for the hyphenated-value enum pattern — a
 * {@code @RequestParam} enum otherwise 500s on any hyphenated value (e.g. "loan-disbursement-adjustment").
 * Registering a converter per enum here routes query-param binding through the same {@code fromValue}.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(String.class, LedgerTxType.class, LedgerTxType::fromValue);
        registry.addConverter(String.class, LedgerTxMethod.class, LedgerTxMethod::fromValue);
    }
}
