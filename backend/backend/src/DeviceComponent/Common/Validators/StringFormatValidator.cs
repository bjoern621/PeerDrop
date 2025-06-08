using backend.src.DeviceComponent.Common.Exception;

namespace backend.src.DeviceComponent.Common.Validators;

public class StringFormatValidator
{

    public static void ValidateStringFormat(string displayName)
    {
        if (string.IsNullOrWhiteSpace(displayName) || displayName.Length < 3)
        {
            throw new InvalidStringFormatException("Display Name must be at least 3 characters long.");
        }
    }
}