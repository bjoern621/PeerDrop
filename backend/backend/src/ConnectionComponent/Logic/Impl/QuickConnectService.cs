using backend.ConnectionComponent.Common.Api.DTOs;
using backend.ConnectionComponent.Logic.Api;
using backend.DeviceComponent.Dataaccess.Api.Repo;
using backend.DeviceComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.ConnectionComponent.Logic.Impl;

public class QuickConnectService(
    IWebSocketHandler _webSocketHandler,
    IServiceScopeFactory _scopeFactory,
    IDeviceService _deviceService,
    IConnectionInitiationService _connectionInitiationService
) : IQuickConnectService
{
    public async Task HandleQuickConnectMessage(string clientToken, QuickConnectMessage message)
    {
        var deviceUuid = message.DeviceUuid;

        var requestingClientId = _webSocketHandler.GetUserIdForClientToken(clientToken);
        if (requestingClientId == null)
        {
            // Requesting client is not logged in
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var deviceRepository = scope.ServiceProvider.GetRequiredService<IDeviceRepository>();
        var device = await deviceRepository.GetDeviceByUuidAsync(
            deviceUuid,
            requestingClientId.Value
        );
        if (device == null)
        {
            // Device is not registered for the requesting client.
            return;
        }

        if (_deviceService.GetDeviceStatus(deviceUuid) != "online")
        {
            // Device is not ready for any connections.
            return;
        }

        var peerClientToken = _deviceService.GetClientTokenByDeviceUuid(deviceUuid);
        if (peerClientToken == null)
        {
            // No client token found for the device UUID, this is unlikely because we just checked the device status to be "online", but it may have been removed in the meantime.
            return;
        }

        if (clientToken == peerClientToken)
        {
            // The requesting client is the same as the peer client, this could happen if the sender sent a malformed request.
            return;
        }

        await _connectionInitiationService.InitiateConnection(clientToken, peerClientToken);
    }
}
