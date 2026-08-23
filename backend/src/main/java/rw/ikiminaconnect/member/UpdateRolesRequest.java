package rw.ikiminaconnect.member;

import jakarta.validation.constraints.NotEmpty;
import java.util.Set;

public record UpdateRolesRequest(@NotEmpty Set<Role> roles) {
}
