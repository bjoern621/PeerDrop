using System.Collections.Concurrent;
using backend.DeviceComponent.Common.DTOs;
using backend.WebSocketComponent.Logic.Api;

namespace backend.DeviceComponent.Logic.Api;

public class RuntimeDeviceInformation
{
    public required Guid DeviceGuid { get; set; }
    public required string LastDeviceStatus { get; set; } // "online", "offline", "tmp_offline"
    public required DateTime LastHeartbeat { get; set; }
}

public class DeviceService(IWebSocketHandler _webSocketHandler) : IDeviceService
{
    // Maps client tokens to device information
    // Devices with DeviceStatus "offline" might or might not be in this list
    private readonly ConcurrentDictionary<string, RuntimeDeviceInformation> _activeDevices = new();

    public Task HandleDeviceHeartbeat(string clientToken, DeviceHeartbeatMessage message)
    {
        Console.WriteLine($"Received heartbeat {message.DeviceStatus} from device {message.Uuid} for client {clientToken}");

        int? userId = _webSocketHandler.GetUserIdForClientToken(clientToken);
        if (userId == null)
        {
            // No userId found for the clientToken (user not logged in)
            Console.WriteLine($"No userId found for client token {clientToken}. Heartbeat is not valid.");
            return Task.CompletedTask;
        }

        lock (_activeDevices)
        {
            if (_activeDevices.TryGetValue(clientToken, out var deviceInfo))
            {
                deviceInfo.LastHeartbeat = DateTime.UtcNow;
                deviceInfo.LastDeviceStatus = message.DeviceStatus;
                Console.WriteLine($"Updated heartbeat for device {message.Uuid} for client {clientToken}");
            }
            else
            {
                _activeDevices[clientToken] = new RuntimeDeviceInformation { DeviceGuid = message.Uuid, LastHeartbeat = DateTime.UtcNow, LastDeviceStatus = message.DeviceStatus };
                Console.WriteLine($"Registered new device {message.Uuid} for client {clientToken}");
            }
        }

        // Send the device heartbeat to all active client tokens of the user
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

    public string GetDeviceStatus(Guid deviceUuid)
    {
        lock (_activeDevices)
        {
            foreach (var kvp in _activeDevices)
            {
                var deviceInfo = kvp.Value;
                if (deviceInfo.DeviceGuid == deviceUuid && _webSocketHandler.GetUserIdForClientToken(kvp.Key) != null)
                {
                    // LastDeviceStatus is valid if the device is in the _activeDevices list and has a valid userId (client is logged in)
                    return deviceInfo.LastDeviceStatus;
                }
            }
        }

        // The device is not in the _activeDevices list meaning it's offline
        return "offline";
    }
}