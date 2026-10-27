using backend.DeviceComponent.Dataaccess.Api.Repo;
using backend.MessagingComponent.Dataaccess.Api;
using backend.DeviceComponent.Logic.Api;
using backend.MessagingComponent.Common.Api.DTOs;
using backend.MessagingComponent.Common.Api.Validators;
using backend.MessagingComponent.Logic.Api;
using backend.MessagingComponent.Logic.Types;
using backend.TelemetryComponent.Logic.Api;
using backend.TokenComponent.Logic.Api;

namespace backend.MessagingComponent.Logic.Impl;

public class TokenLookupService(
    IClientRegistry _clientRegistry,
    IPublicKeyRepository _publicKeys,
    IAbuseGuard _abuseGuard,
    IPresenceWatchRepository _presenceWatchRepository,
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

        _publicKeys.Set(clientToken, message.Key);
        return TellWatchersOnline(clientToken.ToLowerInvariant());
    }

    // Waits for the public key, since a watcher can encrypt for the token only with it.
    private async Task TellWatchersOnline(string token)
    {
        foreach (var watcher in _presenceWatchRepository.WatchersOf(token))
        {
            await _clientRegistry.SendMessage(watcher, OnlineStatus(watcher, token, null));
        }
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

        if (status.Token != string.Empty)
            _presenceWatchRepository.Watch(clientToken, status.Token);

        await _clientRegistry.SendMessage(clientToken, status);
    }

    public async Task HandleClientDisconnected(string clientToken)
    {
        var token = clientToken.ToLowerInvariant();
        _publicKeys.Remove(token);

        foreach (var watcher in _presenceWatchRepository.RemoveClient(token))
        {
            await _clientRegistry.SendMessage(watcher, OfflineStatus(token, null, null));
        }
    }

    private TokenStatusMessage LookUpToken(string clientToken, string token)
    {
        var requesterIp = _clientRegistry.GetRemoteIpAddressForClientToken(clientToken);

        var lockRemaining = _abuseGuard.GetUnknownTokenLock(clientToken, requesterIp);
        if (lockRemaining != null)
        {
            _usageMetrics.TokenLookedUp("locked");
            return OfflineStatus(token, null, lockRemaining);
        }

        if (!_clientRegistry.RemoteTokenExists(token))
        {
            _usageMetrics.TokenLookedUp("unknown");
            return OfflineStatus(token, null, _abuseGuard.RecordUnknownTokenMiss(clientToken, requesterIp));
        }

        _usageMetrics.TokenLookedUp("online");
        return OnlineStatus(clientToken, token, null);
    }

    private async Task<TokenStatusMessage> LookUpDevice(string clientToken, Guid deviceUuid)
    {
        var userId = _clientRegistry.GetUserIdForClientToken(clientToken);
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
        if (string.IsNullOrEmpty(deviceToken) || !_clientRegistry.RemoteTokenExists(deviceToken))
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
            PublicKey = _publicKeys.Get(token),
            OwnDevice = _clientRegistry.AreSignedInWithSameAccount(clientToken, token),
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
