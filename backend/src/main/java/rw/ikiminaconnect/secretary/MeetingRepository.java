package rw.ikiminaconnect.secretary;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MeetingRepository extends JpaRepository<Meeting, UUID> {
    List<Meeting> findAllByOrganizationIdOrderByMeetingDateDesc(UUID organizationId);
    Optional<Meeting> findByIdAndOrganizationId(UUID id, UUID organizationId);
}
