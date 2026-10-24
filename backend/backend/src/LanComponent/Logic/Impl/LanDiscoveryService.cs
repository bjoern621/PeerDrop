using backend.LanComponent.Common.Api.DTOs;
using backend.LanComponent.Logic.Api;
using backend.WebSocketComponent.Common.Api.DTOs;
using backend.WebSocketComponent.Logic.Api;

namespace backend.LanComponent.Logic.Impl;

public class LanDiscoveryService(IWebSocketHandler _webSocketHandler, ILogger<LanDiscoveryService> _logger) : ILanDiscoveryService
{
    // Maps client token to its network membership. Clients without a resolvable
    // IP address are not tracked and do not take part in discovery.
    // DiscoveryEnabled false hides the client from every peer list, its own
    // included. A fresh entry starts hidden and the client's own report opens it up.
    private readonly Dictionary<string, (string RemoteIpAddress, string? Os, string? Browser, bool DiscoveryEnabled)> _peers = new();

    private readonly Lock _lock = new();

    public Task HandleClientConnected(ClientConnectedEvent connectedEvent)
    {
        if (string.IsNullOrEmpty(connectedEvent.RemoteIpAddress))
        {
            _logger.LogDebug($"Client {connectedEvent.ClientToken} has no remote IP address, skipping LAN discovery.");
            return Task.CompletedTask;
        }

        var (os, browser) = ParseDeviceInfo(connectedEvent.UserAgent);

        lock (_lock)
        {
            // Hidden until the client reports its setting, so a page reload
            // never shows the device to its network for the moment in between.
            _peers[connectedEvent.ClientToken] = (connectedEvent.RemoteIpAddress, os, browser, false);
        }

        // The client's own report notifies the network once it arrives.
        return Task.CompletedTask;
    }

    public async Task HandleClientDisconnected(string clientToken)
    {
        string? remoteIpAddress = null;

        lock (_lock)
        {
            if (_peers.TryGetValue(clientToken, out var entry))
            {
                remoteIpAddress = entry.RemoteIpAddress;
                _peers.Remove(clientToken);
            }
        }

        if (remoteIpAddress != null)
            await NotifyNetwork(remoteIpAddress);
    }

    public async Task HandleLanPeersRequest(string clientToken, RequestLanPeersMessage message)
    {
        LanPeersMessage response;

        lock (_lock)
        {
            var peers = _peers.TryGetValue(clientToken, out var entry) && entry.DiscoveryEnabled
                ? BuildPeerListUnlocked(entry.RemoteIpAddress, clientToken)
                : [];

            response = new LanPeersMessage { Peers = peers };
        }

        await _webSocketHandler.SendMessage(clientToken, response);
    }

    public async Task HandleLanDiscoveryState(string clientToken, LanDiscoveryStateMessage message)
    {
        string remoteIpAddress;

        lock (_lock)
        {
            if (!_peers.TryGetValue(clientToken, out var entry) || entry.DiscoveryEnabled == message.Enabled)
                return;

            _peers[clientToken] = (entry.RemoteIpAddress, entry.Os, entry.Browser, message.Enabled);
            remoteIpAddress = entry.RemoteIpAddress;
        }

        // NotifyNetwork skips the client from here on, so its now empty list is
        // sent separately.
        if (!message.Enabled)
            await _webSocketHandler.SendMessage(clientToken, new LanPeersMessage { Peers = [] });

        await NotifyNetwork(remoteIpAddress);
    }

    /// <summary>
    /// Builds the peer list for one network, excluding the recipient itself.
    /// Must be called under _lock.
    /// </summary>
    private List<LanPeerDTO> BuildPeerListUnlocked(string remoteIpAddress, string recipientToken)
    {
        return [.. _peers
            .Where(kvp => kvp.Value.RemoteIpAddress == remoteIpAddress
                && kvp.Key != recipientToken
                && kvp.Value.DiscoveryEnabled)
            .Select(kvp => new LanPeerDTO
            {
                Token = kvp.Key,
                Os = kvp.Value.Os,
                Browser = kvp.Value.Browser,
            })];
    }

    /// <summary>
    /// Sends every client in the given network its current peer list (the other
    /// clients on the same IP address). Clients with discovery switched off are
    /// skipped.
    /// </summary>
    private async Task NotifyNetwork(string remoteIpAddress)
    {
        List<(string Token, LanPeersMessage Message)> messages;

        lock (_lock)
        {
            messages = [.. _peers
                .Where(kvp => kvp.Value.RemoteIpAddress == remoteIpAddress && kvp.Value.DiscoveryEnabled)
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
