package rw.ikiminaconnect.member;

import jakarta.validation.Valid;
import java.util.List;
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

    // HR added alongside SECRETARY/ORG_ADMIN — matches GET /members/{id}'s role
    // set below (which already included HR); the list endpoint had simply
    // never been revisited since phase 1-3, before the HR payroll dashboard/
    // reports pages (phase 4/11) needed a member roster at all.
    @GetMapping
    @PreAuthorize("hasAnyRole('SECRETARY','ORG_ADMIN','HR')")
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

    /** Any authenticated member — deliberately open, deliberately minimal (see GuarantorCandidateDto). */
    @GetMapping("/guarantor-candidates")
    public List<GuarantorCandidateDto> guarantorCandidates(@AuthenticationPrincipal CurrentUser currentUser) {
        return memberService.guarantorCandidates(currentUser.organizationId(), currentUser.userId());
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

    @PutMapping("/{id}/committee-chair")
    @PreAuthorize("hasRole('ORG_ADMIN')")
    public MemberDetail setCommitteeChair(
            @AuthenticationPrincipal CurrentUser currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody SetCommitteeChairRequest request) {
        return memberService.setCommitteeChair(
                currentUser.organizationId(), id, request, currentUser.userId(), currentUser.fullName());
    }
}
