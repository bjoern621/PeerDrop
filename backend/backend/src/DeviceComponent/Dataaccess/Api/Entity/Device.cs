using backend.DeviceComponent.Common.Validators;

namespace backend.DeviceComponent.Dataaccess.Api.Entity;

public class Device
{
    private readonly string _displayName;
    private readonly Guid _uuid;
    private readonly int _accountId;

    public Device(string displayName, Guid uuid, int accountId)
    {
        StringFormatValidator.ValidateDisplayNameFormat(displayName);

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

    public static Device Of(string displayName, Guid uuid, int accountId)
    {
        StringFormatValidator.ValidateDisplayNameFormat(displayName);

        return new Device(
            displayName,
            uuid,
            accountId
        );
    }

}
