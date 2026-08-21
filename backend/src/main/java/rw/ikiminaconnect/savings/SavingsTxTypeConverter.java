package rw.ikiminaconnect.savings;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class SavingsTxTypeConverter implements AttributeConverter<SavingsTxType, String> {

    @Override
    public String convertToDatabaseColumn(SavingsTxType attribute) {
        return attribute == null ? null : attribute.toValue();
    }

    @Override
    public SavingsTxType convertToEntityAttribute(String dbData) {
        return dbData == null ? null : SavingsTxType.fromValue(dbData);
    }
}
