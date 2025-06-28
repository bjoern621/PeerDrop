using System.Collections.Concurrent;
using backend.DeviceComponent.Common.DTOs;
using backend.DeviceComponent.Dataaccess.Api.Entity;
using backend.WebSocketComponent.Logic.Api;

namespace backend.DeviceComponent.Logic.Api;

public class RuntimeDeviceInformation
{
    public required Guid DeviceGuid { get; set; }
    public required DateTime LastHeartbeat { get; set; }
}

public class DeviceService(IWebSocketHandler _webSocketHandler) : IDeviceService
{
    // Maps client tokens to device information
    private readonly ConcurrentDictionary<string, RuntimeDeviceInformation> _activeDevices = new();

    public Task HandleDeviceHeartbeat(string clientToken, DeviceHeartbeatMessage message)
    {
        Console.WriteLine($"Received heartbeat from device {message.Uuid} for client {clientToken}");

        lock (_activeDevices)
        {
            if (_activeDevices.TryGetValue(clientToken, out var deviceInfo))
            {
                deviceInfo.LastHeartbeat = DateTime.UtcNow;
                Console.WriteLine($"Updated heartbeat for device {message.Uuid} for client {clientToken}");
            }
            else
            {
                _activeDevices[clientToken] = new RuntimeDeviceInformation { DeviceGuid = message.Uuid, LastHeartbeat = DateTime.UtcNow };
                Console.WriteLine($"Registered new device {message.Uuid} for client {clientToken}");
            }
        }

        // Send the device heartbeat to all active client tokens of the user
        int? userId = _webSocketHandler.GetUserIdForClientToken(clientToken);
        if (userId == null)
        {
            // No userId found for the clientToken
            return Task.CompletedTask;
        }
        var activeClientTokensForUserId = _webSocketHandler.GetClientTokensForUserId(userId.Value);

        foreach (var token in activeClientTokensForUserId)
        {
            Console.WriteLine($"Forwarding heartbeat for device {message.Uuid} to client {token}");
            // TODO maybe exlude sender token from the forwarded list
            var forwardedHeartbeatMessage = new DeviceHeartbeatMessage
            {
                Uuid = message.Uuid,
                DeviceStatus = message.DeviceStatus
            };

            _webSocketHandler.SendMessage(token, forwardedHeartbeatMessage);
        }

        return Task.CompletedTask;
    }
}