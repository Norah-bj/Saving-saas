package rw.ikiminaconnect.ledger;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class LedgerTxMethodConverter implements AttributeConverter<LedgerTxMethod, String> {

    @Override
    public String convertToDatabaseColumn(LedgerTxMethod attribute) {
        return attribute == null ? null : attribute.toValue();
    }

    @Override
    public LedgerTxMethod convertToEntityAttribute(String dbData) {
        return dbData == null ? null : LedgerTxMethod.fromValue(dbData);
    }
}
