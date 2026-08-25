package rw.ikiminaconnect.auth;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rw.ikiminaconnect.audit.AuditService;
import rw.ikiminaconnect.common.ConflictException;
import rw.ikiminaconnect.common.ForbiddenException;
import rw.ikiminaconnect.common.NotFoundException;
import rw.ikiminaconnect.member.AppUser;
import rw.ikiminaconnect.member.MemberRepository;
import rw.ikiminaconnect.member.MemberStatus;
import rw.ikiminaconnect.member.Role;
import rw.ikiminaconnect.member.UserRoleAssignment;
import rw.ikiminaconnect.organization.Organization;
import rw.ikiminaconnect.organization.OrganizationRepository;
import rw.ikiminaconnect.savings.ShareHolding;
import rw.ikiminaconnect.savings.ShareHoldingRepository;
import rw.ikiminaconnect.security.JwtService;

@Service
public class AuthService {

    // Platform defaults for organization self-signup, matching APUPEKA's real
    // values as sane starting points — never hardcoded elsewhere, editable per
    // organization afterward via organization settings (a later roadmap phase).
    private static final BigDecimal DEFAULT_SHARE_VALUE_RWF = BigDecimal.valueOf(5000);
    private static final BigDecimal DEFAULT_INTEREST_RATE = new BigDecimal("0.05");
    private static final BigDecimal DEFAULT_INSURANCE_RATE = new BigDecimal("0.01");
    private static final int DEFAULT_MIN_MONTHS_BEFORE_ELIGIBLE = 3;
    private static final List<Integer> DEFAULT_REPAYMENT_PERIODS = List.of(3, 6, 12, 24);
    private static final BigDecimal DEFAULT_MIN_MONTHLY_SAVING_RWF = BigDecimal.valueOf(5000);

    private final OrganizationRepository organizationRepository;
    private final MemberRepository memberRepository;
    private final ShareHoldingRepository shareHoldingRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final AuditService auditService;
    private final EmailVerificationService emailVerificationService;

    public AuthService(
            OrganizationRepository organizationRepository,
            MemberRepository memberRepository,
            ShareHoldingRepository shareHoldingRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RefreshTokenService refreshTokenService,
            AuditService auditService,
            EmailVerificationService emailVerificationService) {
        this.organizationRepository = organizationRepository;
        this.memberRepository = memberRepository;
        this.shareHoldingRepository = shareHoldingRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.auditService = auditService;
        this.emailVerificationService = emailVerificationService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (memberRepository.existsByNationalId(request.adminNationalId())) {
            throw new ConflictException("A user with this national ID already exists on the platform.");
        }

        String slug = slugify(request.organizationShortName());
        if (organizationRepository.existsBySlug(slug)) {
            throw new ConflictException("An organization with a similar name is already registered.");
        }

        Organization organization = new Organization(
                request.organizationName(),
                request.organizationShortName(),
                slug,
                request.district(),
                request.sector(),
                request.address(),
                request.contactEmail(),
                request.contactPhone(),
                initials(request.organizationShortName()),
                "#2563eb",
                request.organizationShortName().toUpperCase(Locale.ROOT) + " — OFFICIAL STAMP",
                // Legal representative defaults to the registering admin; editable later.
                request.adminFullName(),
                "Organization Administrator",
                DEFAULT_SHARE_VALUE_RWF,
                DEFAULT_INTEREST_RATE,
                DEFAULT_INSURANCE_RATE,
                DEFAULT_MIN_MONTHS_BEFORE_ELIGIBLE,
                DEFAULT_REPAYMENT_PERIODS,
                DEFAULT_MIN_MONTHLY_SAVING_RWF);
        organization = organizationRepository.save(organization);

        AppUser admin = new AppUser(
                organization,
                request.adminNationalId(),
                request.adminEmployeeId(),
                request.adminFullName(),
                request.adminEmail(),
                request.adminPhone(),
                "Administration",
                "Organization Administrator",
                passwordEncoder.encode(request.password()),
                BigDecimal.ZERO);
        admin.addRole(Role.ORG_ADMIN, false);
        admin.addRole(Role.MEMBER, false);
        admin.activate(); // the registering admin doesn't need a separate activation step
        admin = memberRepository.save(admin);

        shareHoldingRepository.save(new ShareHolding(admin.getId(), organization.getId()));

        auditService.record(organization.getId(), admin.getId(), admin.getFullName(),
                "Registered organization", organization.getName());

        emailVerificationService.issueAndSend(admin);

        return issueTokens(admin);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        AppUser user = memberRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password."));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password.");
        }
        if (user.getStatus() == MemberStatus.suspended || user.getStatus() == MemberStatus.exited) {
            throw new ForbiddenException("This account is " + user.getStatus().name() + ".");
        }

        return issueTokens(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        RefreshTokenService.RotationResult rotation = refreshTokenService.rotate(request.refreshToken());
        AppUser user = memberRepository.findById(rotation.userId())
                .orElseThrow(() -> new ForbiddenException("User no longer exists."));
        return buildResponse(user, jwtService.issueAccessToken(user), rotation.newRawToken());
    }

    public void logout(RefreshRequest request) {
        refreshTokenService.revoke(request.refreshToken());
    }

    @Transactional
    public void verifyEmail(String token) {
        java.util.UUID userId = emailVerificationService.verify(token);
        AppUser user = memberRepository.findById(userId)
                .orElseThrow(() -> new ForbiddenException("User no longer exists."));
        user.verifyEmail();
        memberRepository.save(user);
        auditService.record(user.getOrganizationId(), user.getId(), user.getFullName(),
                "Verified email address", user.getEmail());
    }

    @Transactional
    public void resendVerification(java.util.UUID userId) {
        AppUser user = memberRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found."));
        if (user.isEmailVerified()) {
            throw new ConflictException("Email is already verified.");
        }
        emailVerificationService.issueAndSend(user);
    }

    @Transactional(readOnly = true)
    public MeResponse me(java.util.UUID userId) {
        AppUser user = memberRepository.findById(userId)
                .orElseThrow(() -> new ForbiddenException("User no longer exists."));
        List<String> roleValues = user.getRoles().stream()
                .map(UserRoleAssignment::getRole)
                .map(Role::toValue)
                .toList();
        return new MeResponse(
                user.getId(), user.getOrganizationId(), user.getNationalId(), user.getEmployeeId(),
                user.getFullName(), user.getEmail(), user.getPhone(), user.getDepartment(), user.getPosition(),
                user.getStatus().name(), roleValues, user.isCommitteeChair(), user.getMonthlySalaryRwf(),
                user.getDateJoined(), user.isEmailVerified());
    }

    private AuthResponse issueTokens(AppUser user) {
        String accessToken = jwtService.issueAccessToken(user);
        String refreshToken = refreshTokenService.issue(user.getId());
        return buildResponse(user, accessToken, refreshToken);
    }

    private AuthResponse buildResponse(AppUser user, String accessToken, String refreshToken) {
        List<String> roleValues = user.getRoles().stream()
                .map(UserRoleAssignment::getRole)
                .map(Role::toValue)
                .toList();
        var summary = new AuthResponse.UserSummary(
                user.getId(), user.getOrganizationId(), user.getFullName(), roleValues, user.isCommitteeChair(),
                user.isEmailVerified());
        return new AuthResponse(accessToken, refreshToken, jwtService.accessTokenTtlSeconds(), summary);
    }

    private static String slugify(String input) {
        return input.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    }

    private static String initials(String shortName) {
        String cleaned = shortName.replaceAll("[^A-Za-z]", "");
        return cleaned.length() >= 2
                ? cleaned.substring(0, 2).toUpperCase(Locale.ROOT)
                : cleaned.toUpperCase(Locale.ROOT);
    }
}
