package rw.ikiminaconnect.member;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Mirrors src/lib/types.ts's Role union exactly, including the hyphenated
 * string values ("loan-committee", "org-admin", "super-admin") the frontend
 * expects over the wire. Java enum constants can't contain hyphens, so
 * {@link #toValue()}/{@link #fromValue(String)} do the translation for both
 * JSON (Jackson, via the annotations below) and JPA persistence (see
 * {@link RoleConverter}) — one conversion, two call sites, kept in sync here.
 */
public enum Role {
    MEMBER, SECRETARY, ACCOUNTANT, LOAN_COMMITTEE, HR, ORG_ADMIN, SUPER_ADMIN;

    @JsonValue
    public String toValue() {
        return name().toLowerCase().replace('_', '-');
    }

    @JsonCreator
    public static Role fromValue(String value) {
        return Role.valueOf(value.toUpperCase().replace('-', '_'));
    }
}
