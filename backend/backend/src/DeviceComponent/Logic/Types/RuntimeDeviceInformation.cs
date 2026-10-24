namespace backend.DeviceComponent.Logic.Types;

public class RuntimeDeviceInformation
{
    public required Guid DeviceGuid { get; set; }
    public required string LastDeviceStatus { get; set; } // "online" or "offline"
    public required DateTime LastHeartbeat { get; set; }
}