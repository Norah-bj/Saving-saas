package rw.ikiminaconnect.member;

import java.util.UUID;

/**
 * Deliberately minimal — unlike MemberSummary/MemberDetail, this is
 * reachable by any authenticated member (see MemberRepository), not just
 * staff, so it must never carry anything sensitive (national ID, savings
 * balance, salary, ...).
 */
public record GuarantorCandidateDto(UUID id, String fullName, String department) {

    public static GuarantorCandidateDto from(AppUser user) {
        return new GuarantorCandidateDto(user.getId(), user.getFullName(), user.getDepartment());
    }
}
