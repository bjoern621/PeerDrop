using backend.ConnectionComponent.Common.Api.DTOs;
using backend.ConnectionComponent.Dataaccess.Api;
using backend.ConnectionComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.ConnectionComponent.Logic.Impl;

public class PeerConnectionService(
    IWebSocketHandler _webSocketHandler,
    IPairRepository _pairRepository,
    IConnectionInitiationService _connectionInitiationService,
    ILogger<PeerConnectionService> _logger) : IPeerConnectionService
{
    public async Task HandlePeerConnect(string clientToken, PeerConnectMessage message)
    {
        _logger.LogDebug($"from {clientToken}: Peer Connect");

        if (string.IsNullOrEmpty(message.To))
            return;

        var targetToken = message.To.ToLowerInvariant();

        if (string.Equals(targetToken, clientToken, StringComparison.OrdinalIgnoreCase)
            || !_webSocketHandler.RemoteTokenExists(targetToken))
        {
            _logger.LogDebug($"Peer connect from {clientToken} to {targetToken}, but the target is offline or the sender itself. Ignoring.");
            return;
        }

        string path;
        if (_webSocketHandler.AreSignedInWithSameAccount(clientToken, targetToken))
        {
            _pairRepository.AddPermission(clientToken, targetToken);
            _pairRepository.AddPermission(targetToken, clientToken);
            path = "own_device";
        }
        else if (_pairRepository.HasPermissionEitherWay(clientToken, targetToken))
        {
            path = "reconnect";
        }
        else
        {
            _logger.LogDebug($"Peer connect from {clientToken} to {targetToken} without permission. Ignoring.");
            return;
        }

        await _connectionInitiationService.InitiateConnection(clientToken, targetToken, path);
    }

    public async Task HandleCloseConnection(string clientToken, CloseConnectionMessage message)
    {
        _logger.LogDebug($"from {clientToken}: Close Connection");

        if (string.IsNullOrEmpty(message.RemoteToken)
            || !_pairRepository.TryRemoveConnectedPair(clientToken, message.RemoteToken))
        {
            _logger.LogDebug($"Close connection from {clientToken} to {message.RemoteToken}, but they are not connected. Ignoring.");
            return;
        }

        await _webSocketHandler.SendMessage(message.RemoteToken, new CloseConnectionMessage { RemoteToken = clientToken });
        _logger.LogDebug($"to {message.RemoteToken}: Close Connection");
    }

    public async Task HandleClientDisconnected(string clientToken)
    {
        var partners = _pairRepository.RemoveClient(clientToken);

        foreach (var partner in partners)
        {
            await _webSocketHandler.SendMessage(partner, new CloseConnectionMessage { RemoteToken = clientToken });
            _logger.LogDebug($"to {partner}: Close Connection: Partner {clientToken} disconnected");
        }
    }
}
