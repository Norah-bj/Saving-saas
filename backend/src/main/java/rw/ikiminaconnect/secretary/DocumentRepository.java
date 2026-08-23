package rw.ikiminaconnect.secretary;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DocumentRepository extends JpaRepository<DocumentItem, UUID> {

    List<DocumentItem> findAllByOrganizationIdOrderByUploadedDateDesc(UUID organizationId);

    @Query("SELECT d FROM DocumentItem d WHERE d.organizationId = :orgId "
            + "AND d.visibility = rw.ikiminaconnect.secretary.DocumentVisibility.all "
            + "ORDER BY d.uploadedDate DESC")
    List<DocumentItem> findVisibleToPlainMembers(@Param("orgId") UUID organizationId);
}
