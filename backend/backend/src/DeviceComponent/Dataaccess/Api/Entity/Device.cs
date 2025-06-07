using backend.DeviceComponent.Common.DTOs;
using backend.DeviceComponent.Common.Exception;

namespace backend.DeviceComponent.Dataaccess.Api.Entity;

public class Device
{
    private readonly string _displayName;
    private readonly Guid _uuid;
    private readonly int _accountId;

    public Device(string displayName, Guid uuid, int accountId)
    {
        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("DisplayName cannot be null or empty.");

        _displayName = displayName;
        _uuid = uuid;
        _accountId = accountId;
    }

    public string GetDisplayName()
    {
        return _displayName;
    }

    public Guid GetUuid()
    {
        return _uuid;
    }

    public int GetAccountId()
    {
        return _accountId;
    }

    public static Device Of(DeviceRegisterDto dto, string displayName)
    {
        ValidateDisplayNameFormat(displayName);

        return new Device(
            displayName,
            Guid.NewGuid(),
            dto.AccountId
        );
    }

    public static void ValidateDisplayNameFormat(string displayName)
    {
        if (string.IsNullOrWhiteSpace(displayName) || displayName.Length < 3)
        {
            throw new InvalidDisplayNameFormatException("Display Name must be at least 3 characters long.");
        }
    }
}
