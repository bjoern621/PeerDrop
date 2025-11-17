using backend.DeviceComponent.Common.DTOs;

namespace backend.DeviceComponent.Logic.Api;

public interface IDeviceService
{
    Task HandleDeviceHeartbeat(string clientToken, DeviceHeartbeatMessage message);

    /// <summary>
    /// Deletes the device from the active devices list when it is deleted.
    /// This means that the device is now offline.
    /// </summary>
    void HandleDeviceDelete(Guid uuid, int userId, string deviceStatus);

    /// <summary>
    /// Gets the status of a device by its UUID.
    /// Returns either "offline", "online", or "busy".
    /// </summary>
    string GetDeviceStatus(Guid deviceUuid);

    /// <summary>
    /// Gets the client token for a device by its UUID.
    /// There may be multiple client tokens for a device if the user has multiple active sessions or old entries aren't deleted yet.
    /// Returns the first client token that matches the device UUID and has device status "online".
    /// It is not guaranteed that the returned client token is still valid, as the client may have been disconnected / logged out. Use GetDeviceStatus() to check the actual status.
    /// </summary>
    string GetClientTokenByDeviceUuid(Guid deviceUuid);

    /// <summary>
    /// Sends a device-changed message to all active client tokens of the user.
    /// This notifies all connected clients that a device was added or removed.
    /// </summary>
    void SendDeviceChangedMessage(int userId, string action, Guid deviceUuid, string displayName, string status);
}