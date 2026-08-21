package rw.ikiminaconnect.loan;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class LoanStatusConverter implements AttributeConverter<LoanStatus, String> {

    @Override
    public String convertToDatabaseColumn(LoanStatus attribute) {
        return attribute == null ? null : attribute.toValue();
    }

    @Override
    public LoanStatus convertToEntityAttribute(String dbData) {
        return dbData == null ? null : LoanStatus.fromValue(dbData);
    }
}
