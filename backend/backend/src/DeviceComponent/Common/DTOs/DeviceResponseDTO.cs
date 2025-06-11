namespace backend.DeviceComponent.Common.DTOs;

public class DeviceResponseDTO
{
    public required List<DeviceLoginDto> Devices { get; set; }
}