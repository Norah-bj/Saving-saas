package rw.ikiminaconnect;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// UserDetailsServiceAutoConfiguration excluded: this API has no use for Spring
// Security's UserDetailsService/AuthenticationManager flow — login is handled
// manually in AuthService (direct password check against the DB), and the only
// authentication path is JwtAuthenticationFilter. Left enabled, Spring Boot
// auto-creates a random in-memory user and logs its password on every startup
// for a login mechanism (form/basic auth) this app never turns on.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class IkiminaConnectApplication {
    public static void main(String[] args) {
        SpringApplication.run(IkiminaConnectApplication.class, args);
    }
}
