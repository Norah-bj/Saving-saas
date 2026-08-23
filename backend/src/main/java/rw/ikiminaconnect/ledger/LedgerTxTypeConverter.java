package rw.ikiminaconnect.ledger;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class LedgerTxTypeConverter implements AttributeConverter<LedgerTxType, String> {

    @Override
    public String convertToDatabaseColumn(LedgerTxType attribute) {
        return attribute == null ? null : attribute.toValue();
    }

    @Override
    public LedgerTxType convertToEntityAttribute(String dbData) {
        return dbData == null ? null : LedgerTxType.fromValue(dbData);
    }
}
