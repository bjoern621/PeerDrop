using backend.DeviceComponent.Common.Exception;

namespace backend.DeviceComponent.Common.Validators;

public class DisplayNameValidator
{
    public const int MaxDisplayNameLength = 64;

    public static void ValidateDisplayNameFormat(string displayName)
    {
        if (string.IsNullOrWhiteSpace(displayName) || displayName.Length < 3)
        {
            throw new InvalidDisplayNameException("Display Name must be at least 3 characters long.");
        }

        if (displayName.Length > MaxDisplayNameLength)
        {
            throw new InvalidDisplayNameException($"Display Name must be at most {MaxDisplayNameLength} characters long.");
        }
    }
}