using System.Collections.Concurrent;
using backend.DeviceComponent.Common.DTOs;
using backend.DeviceComponent.Dataaccess.Api.Repo;
using backend.DeviceComponent.Logic.Api;
using backend.DeviceComponent.Logic.Types;
using backend.WebSocketComponent.Logic.Api;

namespace backend.DeviceComponent.Logic.Impl;

public class DeviceService(ILogger<DeviceService> logger) : IDeviceService
{
    // Maps client tokens to device information
    // Devices with DeviceStatus "offline" might or might not be in this list
    // The list might also contain the same device for multiple client tokens, e.g. the user logged out and back in quickly
    private readonly ConcurrentDictionary<string, RuntimeDeviceInformation> _activeDevices = new();

    private const int INACTIVE_HEARTBEAT_CHECK_INTERVAL_MS = 1000 * 60; // 1 minute; THIS IS LINKED TO THE FRONTEND VARIABLE: HEARTBEAT_INTERVAL_MS
    private const int INACTIVE_HEARTBEAT_THRESHOLD_MS = 1000 * 30; // Amount of time additional to INACTIVE_HEARTBEAT_CHECK_INTERVAL_MS in milliseconds after which a device is considered inactive if it has not sent a heartbeat, e.g. 1 minute (INACTIVE_HEARTBEAT_CHECK_INTERVAL_MS) + 30 seconds (INACTIVE_HEARTBEAT_THRESHOLD_MS) = 1 minute 30 seconds

    private readonly IWebSocketHandler _webSocketHandler = null!;
    private readonly IServiceScopeFactory _scopeFactory = null!; // Used to get a scoped IDeviceRepository

    public DeviceService(IWebSocketHandler webSocketHandler, IServiceScopeFactory scopeFactory, ILogger<DeviceService> logger) : this(logger)
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
            logger.LogTrace("Checking for inactive devices...");

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
                logger.LogDebug($"Removed inactive device {kvp.Value.DeviceGuid} for client {kvp.Key}");

                bool anotherEntryForThisDeviceAvailable = _activeDevices.Values.Any(deviceInfo => deviceInfo.DeviceGuid == kvp.Value.DeviceGuid);

                if (anotherEntryForThisDeviceAvailable)
                {
                    // The device might be still online through another connection.
                    // Do not send an "offline" update.
                    // Console.WriteLine($"Device {kvp.Value.DeviceGuid} might still be online through another connection, not sending offline update.");
                    continue;
                }

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
            logger.LogDebug($"Forwarding heartbeat for device {uuid} to client {token}");
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
        logger.LogDebug($"Received heartbeat {message.DeviceStatus} from device {message.Uuid} for client {clientToken}");

        int? realUserId = _webSocketHandler.GetUserIdForClientToken(clientToken);
        if (realUserId == null)
        {
            // No userId found for the clientToken (user has websocket connection but is not logged in)
            logger.LogDebug($"No userId found for client token {clientToken}. Heartbeat is not valid.");
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IDeviceRepository>();
        var device = await repo.GetDeviceByUuidAsync(message.Uuid);

        if (device == null)
        {
            // Device not found in the database
            logger.LogDebug($"Device with UUID {message.Uuid} not found in the database. Heartbeat is not valid.");
            return;
        }

        if (device.GetAccountId() != realUserId)
        {
            // Device does not belong to the sending user
            logger.LogDebug($"Device with UUID {message.Uuid} does not belong to user {realUserId}. Heartbeat is not valid.");
            return;
        }

        lock (_activeDevices)
        {
            if (_activeDevices.TryGetValue(clientToken, out var deviceInfo))
            {
                if (deviceInfo.DeviceGuid != message.Uuid)
                {
                    // The device UUID does not match the one stored for this client token
                    logger.LogDebug($"Device UUID mismatch for client {clientToken}: expected {deviceInfo.DeviceGuid}, received {message.Uuid}.");
                    return;
                }

                logger.LogDebug($"Updated heartbeat for device {message.Uuid} for client {clientToken} from {deviceInfo.LastDeviceStatus} to {message.DeviceStatus}");
                deviceInfo.LastHeartbeat = DateTime.UtcNow;
                deviceInfo.LastDeviceStatus = message.DeviceStatus;
            }
            else
            {
                _activeDevices[clientToken] = new RuntimeDeviceInformation { DeviceGuid = message.Uuid, LastHeartbeat = DateTime.UtcNow, LastDeviceStatus = message.DeviceStatus };
                logger.LogDebug($"Registered new device {message.Uuid} for client {clientToken} with status {message.DeviceStatus}");
            }
        }

        // TODO maybe exlude sender token from the forwarded list
        SendHeartbeatToAllActiveClientTokens(realUserId.Value, message.Uuid, message.DeviceStatus);
    }

    public void HandleDeviceDelete(Guid uuid, int userId, string deviceStatus)
    {
        // Delete from the _activeDevices list
        foreach (var kvp in _activeDevices.ToArray())
        {
            if (kvp.Value.DeviceGuid == uuid)
            {
                _activeDevices.TryRemove(kvp.Key, out _);
                logger.LogDebug($"Removed deleted device {kvp.Value.DeviceGuid} for client {kvp.Key}");
            }
        }
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

    public string GetClientTokenByDeviceUuid(Guid deviceUuid)
    {
        lock (_activeDevices)
        {
            foreach (var kvp in _activeDevices)
            {
                if (kvp.Value.DeviceGuid == deviceUuid && kvp.Value.LastDeviceStatus == "online")
                {
                    return kvp.Key;
                }
            }
        }

        return string.Empty;
    }

    public void SendDeviceChangedMessage(int userId, string action, Guid deviceUuid, string displayName, string status)
    {
        var activeClientTokensForUserId = _webSocketHandler.GetClientTokensForUserId(userId);

        foreach (var token in activeClientTokensForUserId)
        {
            logger.LogDebug($"Sending device-changed message (action: {action}) for device {deviceUuid} to client {token}");
            var deviceChangedMessage = new DeviceChangedMessage
            {
                Action = action,
                Device = new DeviceInfo
                {
                    Uuid = deviceUuid,
                    DisplayName = displayName,
                    Status = status
                }
            };

            _webSocketHandler.SendMessage(token, deviceChangedMessage);
        }
    }
}