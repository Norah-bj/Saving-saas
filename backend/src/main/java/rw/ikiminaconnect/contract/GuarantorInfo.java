package rw.ikiminaconnect.contract;

import java.math.BigDecimal;

public record GuarantorInfo(String fullName, String nationalId, String phone, BigDecimal amountGuaranteed) {
}
