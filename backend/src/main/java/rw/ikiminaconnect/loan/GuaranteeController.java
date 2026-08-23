package rw.ikiminaconnect.loan;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rw.ikiminaconnect.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/guarantees")
public class GuaranteeController {

    private final GuaranteeService guaranteeService;

    public GuaranteeController(GuaranteeService guaranteeService) {
        this.guaranteeService = guaranteeService;
    }

    /** Always "my guarantee requests" — a personal inbox, not an org-wide admin view. */
    @GetMapping
    public List<GuaranteeDto> myGuarantees(@AuthenticationPrincipal CurrentUser currentUser) {
        return guaranteeService.myGuarantees(currentUser.organizationId(), currentUser.userId());
    }

    @PostMapping("/{id}/respond")
    public GuaranteeDto respond(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody RespondGuaranteeRequest request) {
        return guaranteeService.respond(
                currentUser.organizationId(), id, currentUser.userId(), request.accept(), currentUser.fullName());
    }
}
