using System.Collections.Concurrent;
using backend.DeviceComponent.Common.DTOs;
using backend.DeviceComponent.Dataaccess.Api.Repo;
using backend.WebSocketComponent.Logic.Api;

namespace backend.DeviceComponent.Logic.Api;

public class DeviceService() : IDeviceService
{
    // Maps client tokens to device information
    // Devices with DeviceStatus "offline" might or might not be in this list
    // The list might also contain the same device for multiple client tokens, e.g. the user logged out and back in quickly
    private readonly ConcurrentDictionary<string, RuntimeDeviceInformation> _activeDevices = new();

    private const int INACTIVE_HEARTBEAT_CHECK_INTERVAL_MS = 1000 * 60; // 1 minute; THIS IS LINKED TO THE FRONTEND VARIABLE: HEARTBEAT_INTERVAL_MS
    private const int INACTIVE_HEARTBEAT_THRESHOLD_MS = 1000 * 30; // Amount of time additional to INACTIVE_HEARTBEAT_CHECK_INTERVAL_MS in milliseconds after which a device is considered inactive if it has not sent a heartbeat, e.g. 1 minute (INACTIVE_HEARTBEAT_CHECK_INTERVAL_MS) + 30 seconds (INACTIVE_HEARTBEAT_THRESHOLD_MS) = 1 minute 30 seconds

    private readonly IWebSocketHandler _webSocketHandler = null!;
    private readonly IServiceScopeFactory _scopeFactory = null!; // Used to get a scoped IDeviceRepository

    public DeviceService(IWebSocketHandler webSocketHandler, IServiceScopeFactory scopeFactory) : this()
    {
        _webSocketHandler = webSocketHandler;
        _scopeFactory = scopeFactory;
        Task.Run(CleanupInactiveDevicesLoop);
    }

    private async Task CleanupInactiveDevicesLoop()
    {
        while (true)
        {
            await Task.Delay(TimeSpan.FromMilliseconds(INACTIVE_HEARTBEAT_CHECK_INTERVAL_MS));
            // Console.WriteLine("Checking for inactive devices...");

            var now = DateTime.UtcNow;
            var inactiveThreshold = now - TimeSpan.FromMilliseconds(INACTIVE_HEARTBEAT_CHECK_INTERVAL_MS + INACTIVE_HEARTBEAT_THRESHOLD_MS);

            foreach (var kvp in _activeDevices.ToArray())
            {
                if (!(kvp.Value.LastHeartbeat < inactiveThreshold))
                {
                    // Device is still active, skip it
                    continue;
                }

                // Remove device because it has not sent a heartbeat in the last INACTIVE_HEARTBEAT_CHECK_INTERVAL_MS + INACTIVE_HEARTBEAT_THRESHOLD_MS milliseconds

                _activeDevices.TryRemove(kvp.Key, out _);
                // Console.WriteLine($"Removed inactive device {kvp.Value.DeviceGuid} for client {kvp.Key}");

                using var scope = _scopeFactory.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<IDeviceRepository>();
                var device = await repo.GetDeviceByUuidAsync(kvp.Value.DeviceGuid);

                if (device == null)
                {
                    // Something went wrong, the device should be in the database if it is in the _activeDevices list
                    return;
                }

                SendHeartbeatToAllActiveClientTokens(device.GetAccountId(), kvp.Value.DeviceGuid, "offline");
            }
        }
    }

    /// <summary>
    /// Sends a heartbeat message to all active client tokens of the user.
    /// This is used to inform all clients of the user's devices about the current device status.
    /// </summary>
    private void SendHeartbeatToAllActiveClientTokens(int userId, Guid uuid, string deviceStatus)
    {
        var activeClientTokensForUserId = _webSocketHandler.GetClientTokensForUserId(userId);

        foreach (var token in activeClientTokensForUserId)
        {
            // Console.WriteLine($"Forwarding heartbeat for device {uuid} to client {token}");
            var forwardedHeartbeatMessage = new DeviceHeartbeatMessage
            {
                Uuid = uuid,
                DeviceStatus = deviceStatus
            };

            _webSocketHandler.SendMessage(token, forwardedHeartbeatMessage);
        }
    }

    public async Task HandleDeviceHeartbeat(string clientToken, DeviceHeartbeatMessage message)
    {
        // Console.WriteLine($"Received heartbeat {message.DeviceStatus} from device {message.Uuid} for client {clientToken}");

        int? realUserId = _webSocketHandler.GetUserIdForClientToken(clientToken);
        if (realUserId == null)
        {
            // No userId found for the clientToken (user has websocket connection but is not logged in)
            // Console.WriteLine($"No userId found for client token {clientToken}. Heartbeat is not valid.");
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IDeviceRepository>();
        var device = await repo.GetDeviceByUuidAsync(message.Uuid);

        if (device == null)
        {
            // Device not found in the database
            // Console.WriteLine($"Device with UUID {message.Uuid} not found in the database. Heartbeat is not valid.");
            return;
        }

        if (device.GetAccountId() != realUserId)
        {
            // Device does not belong to the sending user
            // Console.WriteLine($"Device with UUID {message.Uuid} does not belong to user {realUserId}. Heartbeat is not valid.");
            return;
        }

        lock (_activeDevices)
        {
            if (_activeDevices.TryGetValue(clientToken, out var deviceInfo))
            {
                deviceInfo.LastHeartbeat = DateTime.UtcNow;
                deviceInfo.LastDeviceStatus = message.DeviceStatus;
                // Console.WriteLine($"Updated heartbeat for device {message.Uuid} for client {clientToken}");
            }
            else
            {
                _activeDevices[clientToken] = new RuntimeDeviceInformation { DeviceGuid = message.Uuid, LastHeartbeat = DateTime.UtcNow, LastDeviceStatus = message.DeviceStatus };
                // Console.WriteLine($"Registered new device {message.Uuid} for client {clientToken}");
            }
        }

        // TODO maybe exlude sender token from the forwarded list
        SendHeartbeatToAllActiveClientTokens(realUserId.Value, message.Uuid, message.DeviceStatus);
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