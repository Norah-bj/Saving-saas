package rw.ikiminaconnect.member;

import jakarta.validation.constraints.NotNull;

public record SetCommitteeChairRequest(@NotNull Boolean chair) {
}
