using backend.DeviceComponent.Common.Exception;

namespace backend.DeviceComponent.Common.Validators;

public class StringFormatValidator
{

    public static void ValidateDisplayNameFormat(string displayName)
    {
        if (string.IsNullOrWhiteSpace(displayName) || displayName.Length < 3)
        {
            throw new InvalidDisplayNameException("Display Name must be at least 3 characters long.");
        }
    }
}