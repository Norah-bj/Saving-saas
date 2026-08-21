package rw.ikiminaconnect.member;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.audit.AuditService;
import rw.ikiminaconnect.common.ConflictException;
import rw.ikiminaconnect.common.NotFoundException;
import rw.ikiminaconnect.organization.Organization;
import rw.ikiminaconnect.organization.OrganizationRepository;
import rw.ikiminaconnect.savings.SavingsService;
import rw.ikiminaconnect.savings.ShareHolding;
import rw.ikiminaconnect.savings.ShareHoldingRepository;

@Service
public class MemberService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final MemberRepository memberRepository;
    private final OrganizationRepository organizationRepository;
    private final ShareHoldingRepository shareHoldingRepository;
    private final SavingsService savingsService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public MemberService(
            MemberRepository memberRepository,
            OrganizationRepository organizationRepository,
            ShareHoldingRepository shareHoldingRepository,
            SavingsService savingsService,
            PasswordEncoder passwordEncoder,
            AuditService auditService) {
        this.memberRepository = memberRepository;
        this.organizationRepository = organizationRepository;
        this.shareHoldingRepository = shareHoldingRepository;
        this.savingsService = savingsService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public Page<MemberSummary> list(UUID organizationId, String search, Pageable pageable) {
        Page<AppUser> page = (search == null || search.isBlank())
                ? memberRepository.findAllByOrganizationId(organizationId, pageable)
                : memberRepository.findAllByOrganizationIdAndFullNameContainingIgnoreCase(
                        organizationId, search, pageable);
        return page.map(this::toSummary);
    }

    @Transactional(readOnly = true)
    public MemberDetail get(UUID organizationId, UUID memberId) {
        AppUser user = memberRepository.findByIdAndOrganizationId(memberId, organizationId)
                .orElseThrow(() -> new NotFoundException("Member not found."));
        return toDetail(user);
    }

    @Transactional
    public CreateMemberResponse create(
            UUID organizationId, CreateMemberRequest request, UUID actorId, String actorName) {
        if (memberRepository.existsByNationalId(request.nationalId())) {
            throw new ConflictException("A user with this national ID already exists on the platform.");
        }
        if (memberRepository.existsByOrganizationIdAndEmployeeId(organizationId, request.employeeId())) {
            throw new ConflictException("A member with this employee ID already exists in this organization.");
        }

        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new NotFoundException("Organization not found."));

        String temporaryPassword = generateTemporaryPassword();
        AppUser member = new AppUser(
                organization,
                request.nationalId(),
                request.employeeId(),
                request.fullName(),
                request.email(),
                request.phone(),
                request.department(),
                request.position(),
                passwordEncoder.encode(temporaryPassword),
                request.monthlySalaryRwf() == null ? BigDecimal.ZERO : request.monthlySalaryRwf());
        member.addRole(Role.MEMBER, false);
        member = memberRepository.save(member);

        shareHoldingRepository.save(new ShareHolding(member.getId(), organizationId));

        auditService.record(organizationId, actorId, actorName, "Added member", member.getFullName());

        return new CreateMemberResponse(toSummary(member), temporaryPassword);
    }

    private MemberSummary toSummary(AppUser user) {
        BigDecimal balance = savingsService.currentBalance(user.getOrganizationId(), user.getId());
        return new MemberSummary(
                user.getId(), user.getNationalId(), user.getEmployeeId(), user.getFullName(),
                user.getDepartment(), user.getPosition(), user.getStatus().name(),
                user.getDateJoined(), balance);
    }

    private MemberDetail toDetail(AppUser user) {
        BigDecimal balance = savingsService.currentBalance(user.getOrganizationId(), user.getId());
        int totalShares = shareHoldingRepository
                .findByMemberIdAndOrganizationId(user.getId(), user.getOrganizationId())
                .map(ShareHolding::getTotalShares)
                .orElse(0);
        List<String> roles = user.getRoles().stream().map(r -> r.getRole().toValue()).toList();

        return new MemberDetail(
                user.getId(), user.getOrganizationId(), user.getNationalId(), user.getEmployeeId(),
                user.getFullName(), user.getEmail(), user.getPhone(), user.getDepartment(), user.getPosition(),
                user.getStatus().name(), user.getDateJoined(), user.getMonthlySalaryRwf(), roles,
                user.isCommitteeChair(), balance, totalShares);
    }

    private static String generateTemporaryPassword() {
        byte[] bytes = new byte[9];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
