using backend.DeviceComponent.Common.DTOs;

namespace backend.DeviceComponent.Logic.Api;

public class DeviceService : IDeviceService
{
    public Task HandleDeviceHeartbeat(string clientToken, DeviceHeartbeatMessage message)
    {
        Console.WriteLine($"Received heartbeat from device {message.Uuid} for client {clientToken}");
        return Task.CompletedTask;
    }
}