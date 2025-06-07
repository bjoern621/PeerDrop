using backend.DeviceComponent.Common.DTOs;

public class DeviceResponse
{
    public required string Message { get; set; }
    public required List<DeviceLoginDto> Devices { get; set; }
}