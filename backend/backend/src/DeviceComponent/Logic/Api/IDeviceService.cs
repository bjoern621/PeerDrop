using backend.DeviceComponent.Common.DTOs;

namespace backend.DeviceComponent.Logic.Api;

public interface IDeviceService
{
    Task HandleDeviceHeartbeat(string clientToken, DeviceHeartbeatMessage message);
}