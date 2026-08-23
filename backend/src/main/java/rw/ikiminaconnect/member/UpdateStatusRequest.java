package rw.ikiminaconnect.member;

import jakarta.validation.constraints.NotNull;

public record UpdateStatusRequest(@NotNull MemberStatus status) {
}
