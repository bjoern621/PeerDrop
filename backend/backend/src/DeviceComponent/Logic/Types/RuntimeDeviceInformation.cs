namespace backend.DeviceComponent.Logic.Api;

public class RuntimeDeviceInformation
{
    public required Guid DeviceGuid { get; set; }
    public required string LastDeviceStatus { get; set; } // "online", "offline", "busy"
    public required DateTime LastHeartbeat { get; set; }
}