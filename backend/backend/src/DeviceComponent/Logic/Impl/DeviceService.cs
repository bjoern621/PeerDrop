using System.Collections.Concurrent;
using backend.DeviceComponent.Common.DTOs;
using backend.DeviceComponent.Dataaccess.Api.Entity;
using backend.DeviceComponent.Dataaccess.Api.Repo;
using backend.WebSocketComponent.Logic.Api;

namespace backend.DeviceComponent.Logic.Api;

public class RuntimeDeviceInformation
{
    public required Device Device { get; set; }
    public DateTime LastHeartbeat { get; set; }
}

public class DeviceService(IDeviceRepository _repo, IWebSocketHandler _webSocketHandler) : IDeviceService
{
    // Maps client tokens to device information
    private readonly ConcurrentDictionary<string, RuntimeDeviceInformation> _activeDevices = new();

    public async Task HandleDeviceHeartbeat(string clientToken, DeviceHeartbeatMessage message)
    {
        Console.WriteLine($"Received heartbeat from device {message.Uuid} for client {clientToken}");

        var device = await _repo.GetDeviceByUuidAsync(message.Uuid);

        lock (_activeDevices)
        {
            if (_activeDevices.TryGetValue(clientToken, out var deviceInfo))
            {
                deviceInfo.LastHeartbeat = DateTime.UtcNow;
                Console.WriteLine($"Updated heartbeat for device {message.Uuid} for client {clientToken}");
            }
            else
            {
                if (device == null)
                {
                    // Client sent a heartbeat for a device that does not exist
                    return;
                }
                _activeDevices[clientToken] = new RuntimeDeviceInformation { Device = device, LastHeartbeat = DateTime.UtcNow };
                Console.WriteLine($"Registered new device {message.Uuid} for client {clientToken}");
            }

            int userId = _activeDevices[clientToken].Device.GetAccountId();
            var activeClientTokensForUserId = _webSocketHandler.GetClientTokensForUserId(userId);

            // Send the updated device information to all clients of the user
            foreach (var token in activeClientTokensForUserId)
            {
                // TODO maybe exlude sender token from the forwarded list
                var forwardedHeartbeatMessage = new DeviceHeartbeatMessage
                {
                    Uuid = message.Uuid,
                    DeviceStatus = message.DeviceStatus
                };

                _webSocketHandler.SendMessage(token, forwardedHeartbeatMessage);
            }
        }
    }
}