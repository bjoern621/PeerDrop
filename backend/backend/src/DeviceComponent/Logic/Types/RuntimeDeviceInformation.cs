namespace backend.DeviceComponent.Logic.Api;

public class RuntimeDeviceInformation
{
    public required Guid DeviceGuid { get; set; }
    public required string LastDeviceStatus { get; set; } // "online", "offline", "tmp_offline"
    public required DateTime LastHeartbeat { get; set; }
}