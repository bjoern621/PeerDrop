using backend.LanComponent.Common.Api.DTOs;
using backend.LanComponent.Logic.Api;
using backend.WebSocketComponent.Common.Api.DTOs;
using backend.WebSocketComponent.Logic.Api;

namespace backend.LanComponent.Logic.Impl;

public class LanDiscoveryService(IWebSocketHandler _webSocketHandler, ILogger<LanDiscoveryService> _logger) : ILanDiscoveryService
{
    private const string STATUS_ONLINE = "online";
    private const string STATUS_BUSY = "busy";

    // Maps client token to its network membership. Clients without a resolvable
    // IP address are not tracked and do not take part in discovery.
    private readonly Dictionary<string, (string RemoteIpAddress, string? Os, string? Browser)> _peers = new();

    // Maps a client token to the token of its current peer connection partner.
    // Both directions are stored. A client in this dictionary is "busy".
    private readonly Dictionary<string, string> _sessionPartners = new();

    private readonly Lock _lock = new();

    public async Task HandleClientConnected(ClientConnectedEvent connectedEvent)
    {
        if (string.IsNullOrEmpty(connectedEvent.RemoteIpAddress))
        {
            _logger.LogDebug($"Client {connectedEvent.ClientToken} has no remote IP address, skipping LAN discovery.");
            return;
        }

        var (os, browser) = ParseDeviceInfo(connectedEvent.UserAgent);

        lock (_lock)
        {
            _peers[connectedEvent.ClientToken] = (connectedEvent.RemoteIpAddress, os, browser);
        }

        await NotifyNetwork(connectedEvent.RemoteIpAddress);
    }

    public async Task HandleClientDisconnected(string clientToken)
    {
        string? remoteIpAddress = null;
        string? partnerIpAddress = null;

        lock (_lock)
        {
            if (_peers.TryGetValue(clientToken, out var entry))
            {
                remoteIpAddress = entry.RemoteIpAddress;
                _peers.Remove(clientToken);
            }

            // A disconnect ends any peer connection the client was in. Free the
            // partner so it is no longer shown as busy.
            if (RemoveSessionUnlocked(clientToken, out var partnerToken)
                && _peers.TryGetValue(partnerToken, out var partnerEntry))
            {
                partnerIpAddress = partnerEntry.RemoteIpAddress;
            }
        }

        await NotifyNetworks(remoteIpAddress, partnerIpAddress);
    }

    public async Task HandleLanPeersRequest(string clientToken, RequestLanPeersMessage message)
    {
        LanPeersMessage response;

        lock (_lock)
        {
            var peers = _peers.TryGetValue(clientToken, out var entry)
                ? BuildPeerListUnlocked(entry.RemoteIpAddress, clientToken)
                : [];

            response = new LanPeersMessage { Peers = peers };
        }

        await _webSocketHandler.SendMessage(clientToken, response);
    }

    public async Task HandleConnectionEstablished(string clientTokenA, string clientTokenB)
    {
        string? ipA = null;
        string? ipB = null;

        lock (_lock)
        {
            _sessionPartners[clientTokenA] = clientTokenB;
            _sessionPartners[clientTokenB] = clientTokenA;

            if (_peers.TryGetValue(clientTokenA, out var entryA))
                ipA = entryA.RemoteIpAddress;
            if (_peers.TryGetValue(clientTokenB, out var entryB))
                ipB = entryB.RemoteIpAddress;
        }

        await NotifyNetworks(ipA, ipB);
    }

    public async Task HandleConnectionClosed(string clientToken)
    {
        string? ipA = null;
        string? ipB = null;

        lock (_lock)
        {
            if (!RemoveSessionUnlocked(clientToken, out var partnerToken))
                return;

            if (_peers.TryGetValue(clientToken, out var entryA))
                ipA = entryA.RemoteIpAddress;
            if (_peers.TryGetValue(partnerToken, out var entryB))
                ipB = entryB.RemoteIpAddress;
        }

        await NotifyNetworks(ipA, ipB);
    }

    /// <summary>
    /// Removes the session the client is in, if any. Returns true and the
    /// partner's token if a session existed. Must be called under _lock.
    /// </summary>
    private bool RemoveSessionUnlocked(string clientToken, out string partnerToken)
    {
        if (!_sessionPartners.TryGetValue(clientToken, out partnerToken!))
            return false;

        _sessionPartners.Remove(clientToken);
        _sessionPartners.Remove(partnerToken);
        return true;
    }

    /// <summary>
    /// Builds the peer list for one network, excluding the recipient itself.
    /// Must be called under _lock.
    /// </summary>
    private List<LanPeerDTO> BuildPeerListUnlocked(string remoteIpAddress, string recipientToken)
    {
        return [.. _peers
            .Where(kvp => kvp.Value.RemoteIpAddress == remoteIpAddress && kvp.Key != recipientToken)
            .Select(kvp => new LanPeerDTO
            {
                Token = kvp.Key,
                Os = kvp.Value.Os,
                Browser = kvp.Value.Browser,
                Status = _sessionPartners.ContainsKey(kvp.Key) ? STATUS_BUSY : STATUS_ONLINE,
            })];
    }

    /// <summary>
    /// Notifies up to two networks, skipping nulls and duplicates.
    /// </summary>
    private async Task NotifyNetworks(string? remoteIpAddressA, string? remoteIpAddressB)
    {
        if (remoteIpAddressA != null)
            await NotifyNetwork(remoteIpAddressA);

        if (remoteIpAddressB != null && remoteIpAddressB != remoteIpAddressA)
            await NotifyNetwork(remoteIpAddressB);
    }

    /// <summary>
    /// Sends every client in the given network its current peer list (the other
    /// clients on the same IP address).
    /// </summary>
    private async Task NotifyNetwork(string remoteIpAddress)
    {
        List<(string Token, LanPeersMessage Message)> messages;

        lock (_lock)
        {
            messages = [.. _peers
                .Where(kvp => kvp.Value.RemoteIpAddress == remoteIpAddress)
                .Select(kvp => (
                    kvp.Key,
                    new LanPeersMessage { Peers = BuildPeerListUnlocked(remoteIpAddress, kvp.Key) }
                ))];
        }

        foreach (var (recipientToken, message) in messages)
        {
            await _webSocketHandler.SendMessage(recipientToken, message);
        }
    }

    /// <summary>
    /// Derives the OS and browser from a User-Agent header. Either value is null
    /// when the header is missing or unrecognized.
    /// </summary>
    private static (string? Os, string? Browser) ParseDeviceInfo(string? userAgent)
    {
        if (string.IsNullOrEmpty(userAgent))
            return (null, null);

        string? browser =
            userAgent.Contains("Edg", StringComparison.OrdinalIgnoreCase) ? "Edge" :
            userAgent.Contains("OPR", StringComparison.OrdinalIgnoreCase) ||
                userAgent.Contains("Opera", StringComparison.OrdinalIgnoreCase) ? "Opera" :
            userAgent.Contains("Firefox", StringComparison.OrdinalIgnoreCase) ? "Firefox" :
            userAgent.Contains("Chrome", StringComparison.OrdinalIgnoreCase) ? "Chrome" :
            userAgent.Contains("Safari", StringComparison.OrdinalIgnoreCase) ? "Safari" :
            null;

        string? os =
            userAgent.Contains("Windows", StringComparison.OrdinalIgnoreCase) ? "Windows" :
            userAgent.Contains("Android", StringComparison.OrdinalIgnoreCase) ? "Android" :
            userAgent.Contains("iPhone", StringComparison.OrdinalIgnoreCase) ? "iPhone" :
            userAgent.Contains("iPad", StringComparison.OrdinalIgnoreCase) ? "iPad" :
            userAgent.Contains("Mac", StringComparison.OrdinalIgnoreCase) ? "macOS" :
            userAgent.Contains("Linux", StringComparison.OrdinalIgnoreCase) ? "Linux" :
            null;

        return (os, browser);
    }
}
