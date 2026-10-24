using backend.DeviceComponent.Dataaccess.Api.Repo;
using backend.DeviceComponent.Logic.Api;
using backend.MessagingComponent.Common.Api.DTOs;
using backend.MessagingComponent.Common.Api.Validators;
using backend.MessagingComponent.Logic.Api;
using backend.MessagingComponent.Logic.Types;
using backend.TelemetryComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.MessagingComponent.Logic.Impl;

public class TokenLookupService(
    IWebSocketHandler _webSocketHandler,
    IAbuseGuard _abuseGuard,
    IDeviceService _deviceService,
    IServiceScopeFactory _scopeFactory,
    IUsageMetrics _usageMetrics,
    ILogger<TokenLookupService> _logger) : ITokenLookupService
{
    public Task HandlePublicKey(string clientToken, PublicKeyMessage message)
    {
        if (!EncryptedMessageValidator.IsValidPublicKey(message.Key))
        {
            _logger.LogDebug($"Received invalid public key from {clientToken}, ignoring.");
            return Task.CompletedTask;
        }

        _webSocketHandler.SetPublicKey(clientToken, message.Key);
        return Task.CompletedTask;
    }

    public async Task HandleTokenLookup(string clientToken, TokenLookupMessage message)
    {
        var hasToken = !string.IsNullOrEmpty(message.Token);
        if (hasToken == (message.DeviceUuid != null))
        {
            _logger.LogDebug($"Received token lookup from {clientToken} without exactly one of token and device UUID, ignoring.");
            return;
        }

        var status = hasToken
            ? LookUpToken(clientToken, message.Token!.ToLowerInvariant())
            : await LookUpDevice(clientToken, message.DeviceUuid!.Value);

        await _webSocketHandler.SendMessage(clientToken, status);
    }

    private TokenStatusMessage LookUpToken(string clientToken, string token)
    {
        var requesterIp = _webSocketHandler.GetRemoteIpAddressForClientToken(clientToken);

        var lockRemaining = _abuseGuard.GetUnknownTokenLock(clientToken, requesterIp);
        if (lockRemaining != null)
        {
            _usageMetrics.TokenLookedUp("locked");
            return OfflineStatus(token, null, lockRemaining);
        }

        if (!_webSocketHandler.RemoteTokenExists(token))
        {
            _usageMetrics.TokenLookedUp("unknown");
            return OfflineStatus(token, null, _abuseGuard.RecordUnknownTokenMiss(clientToken, requesterIp));
        }

        _usageMetrics.TokenLookedUp("online");
        return OnlineStatus(clientToken, token, null);
    }

    private async Task<TokenStatusMessage> LookUpDevice(string clientToken, Guid deviceUuid)
    {
        var userId = _webSocketHandler.GetUserIdForClientToken(clientToken);
        if (userId == null)
        {
            _logger.LogDebug($"Device lookup from {clientToken} without a session.");
            return OfflineStatus(string.Empty, deviceUuid, null);
        }

        using var scope = _scopeFactory.CreateScope();
        var deviceRepository = scope.ServiceProvider.GetRequiredService<IDeviceRepository>();
        if (await deviceRepository.GetDeviceByUuidAsync(deviceUuid, userId.Value) == null)
        {
            _logger.LogDebug($"Device lookup from {clientToken} for device {deviceUuid}, but the device is not registered for user {userId}.");
            return OfflineStatus(string.Empty, deviceUuid, null);
        }

        if (_deviceService.GetDeviceStatus(deviceUuid) != "online")
            return OfflineStatus(string.Empty, deviceUuid, null);

        // Empty if the device went offline since the status check.
        var deviceToken = _deviceService.GetClientTokenByDeviceUuid(deviceUuid);
        if (string.IsNullOrEmpty(deviceToken) || !_webSocketHandler.RemoteTokenExists(deviceToken))
            return OfflineStatus(string.Empty, deviceUuid, null);

        return OnlineStatus(clientToken, deviceToken, deviceUuid);
    }

    private TokenStatusMessage OnlineStatus(string clientToken, string token, Guid? deviceUuid)
    {
        return new TokenStatusMessage
        {
            Token = token,
            DeviceUuid = deviceUuid,
            Online = true,
            PublicKey = _webSocketHandler.GetPublicKeyForClientToken(token),
            OwnDevice = _webSocketHandler.AreSignedInWithSameAccount(clientToken, token),
        };
    }

    private static TokenStatusMessage OfflineStatus(string token, Guid? deviceUuid, TimeSpan? retryAfter)
    {
        return new TokenStatusMessage
        {
            Token = token,
            DeviceUuid = deviceUuid,
            Online = false,
            OwnDevice = false,
            RetryAfterMs = RetryAfter.ToMilliseconds(retryAfter),
        };
    }
}
