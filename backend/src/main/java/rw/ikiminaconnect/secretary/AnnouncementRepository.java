package rw.ikiminaconnect.secretary;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnnouncementRepository extends JpaRepository<Announcement, UUID> {

    List<Announcement> findAllByOrganizationIdOrderByAnnouncementDateDesc(UUID organizationId);

    @Query("SELECT a FROM Announcement a WHERE a.organizationId = :orgId "
            + "AND a.audience <> rw.ikiminaconnect.secretary.AnnouncementAudience.admins "
            + "ORDER BY a.announcementDate DESC")
    List<Announcement> findVisibleToPlainMembers(@Param("orgId") UUID organizationId);
}
