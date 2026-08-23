package rw.ikiminaconnect.member;

import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import rw.ikiminaconnect.common.PageResponse;
import rw.ikiminaconnect.security.CurrentUser;

@RestController
@RequestMapping("/api/v1/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SECRETARY','ORG_ADMIN')")
    public PageResponse<MemberSummary> list(
            @AuthenticationPrincipal CurrentUser currentUser,
            @RequestParam(required = false) String search,
            Pageable pageable) {
        Page<MemberSummary> page = memberService.list(currentUser.organizationId(), search, pageable);
        return PageResponse.from(page);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('SECRETARY','ORG_ADMIN')")
    public CreateMemberResponse create(
            @AuthenticationPrincipal CurrentUser currentUser,
            @Valid @RequestBody CreateMemberRequest request) {
        return memberService.create(
                currentUser.organizationId(), request, currentUser.userId(), currentUser.fullName());
    }

    @GetMapping("/{id}")
    @PreAuthorize("#id == authentication.principal.userId() "
            + "or hasAnyRole('SECRETARY','ORG_ADMIN','ACCOUNTANT','HR','LOAN_COMMITTEE')")
    public MemberDetail get(@AuthenticationPrincipal CurrentUser currentUser, @PathVariable UUID id) {
        return memberService.get(currentUser.organizationId(), id);
    }

    @PutMapping("/{id}/roles")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public MemberDetail updateRoles(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRolesRequest request) {
        return memberService.updateRoles(
                currentUser.organizationId(), id, request, currentUser.userId(), currentUser.fullName());
    }

    @PostMapping("/{id}/status")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public MemberDetail updateStatus(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateStatusRequest request) {
        return memberService.updateStatus(
                currentUser.organizationId(), id, request, currentUser.userId(), currentUser.fullName());
    }
}
