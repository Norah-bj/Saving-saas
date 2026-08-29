package rw.ikiminaconnect.policy;

import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rw.ikiminaconnect.security.CurrentUser;

/** Read-only — any authenticated member of the org can read their own org's policy text. */
@RestController
@RequestMapping("/api/v1/policies")
public class PolicyController {

    private final PolicyDocumentRepository policyDocumentRepository;

    public PolicyController(PolicyDocumentRepository policyDocumentRepository) {
        this.policyDocumentRepository = policyDocumentRepository;
    }

    @GetMapping
    public List<PolicyDocumentDto> list(@AuthenticationPrincipal CurrentUser currentUser) {
        return policyDocumentRepository.findAllByOrganizationIdOrderByCategory(currentUser.organizationId())
                .stream()
                .map(PolicyDocumentDto::from)
                .toList();
    }
}
