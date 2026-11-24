package rw.ikiminaconnect.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountTokenRepository extends JpaRepository<AccountToken, UUID> {

    Optional<AccountToken> findByTokenHashAndPurpose(String tokenHash, AccountToken.Purpose purpose);

    /** Retires every still-open token of one purpose for a user, so only the newest link works. */
    @Modifying
    @Query("UPDATE AccountToken t SET t.usedAt = :now "
            + "WHERE t.userId = :userId AND t.purpose = :purpose AND t.usedAt IS NULL")
    int retireOpen(@Param("userId") UUID userId, @Param("purpose") AccountToken.Purpose purpose,
            @Param("now") Instant now);
}
