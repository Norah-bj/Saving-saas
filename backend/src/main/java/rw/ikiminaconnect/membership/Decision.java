package rw.ikiminaconnect.membership;

/** The staff action on a pending request — distinct from {@link RequestStatus}, which is the resulting persisted state. */
public enum Decision {
    approve, reject
}
