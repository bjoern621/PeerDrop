using backend.ConnectionComponent.Common.Api.DTOs;
using backend.ConnectionComponent.Dataaccess.Api;
using backend.ConnectionComponent.Logic.Api;
using backend.SignalingComponent.Logic.Api;
using backend.TelemetryComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.ConnectionComponent.Logic.Impl;

public class ConnectionInitiationService(
    IWebSocketHandler _webSocketHandler,
    IPairRepository _pairRepository,
    IIceServerProvider _iceServerProvider,
    IUsageMetrics _usageMetrics,
    ILogger<ConnectionInitiationService> _logger) : IConnectionInitiationService
{
    public async Task<bool> InitiateConnection(string clientA, string clientB, string path)
    {
        if (!_pairRepository.TryAddConnectedPair(clientA, clientB))
        {
            _logger.LogDebug($"{clientA} and {clientB} are already connected, not initiating again.");
            return false;
        }

        var ownDevice = _webSocketHandler.AreSignedInWithSameAccount(clientA, clientB);

        var messageToA = new EstablishConnectionMessage
        {
            RemoteToken = clientB,
            IceServers = _iceServerProvider.CreateIceServers(clientA),
            OwnDevice = ownDevice,
        };
        await _webSocketHandler.SendMessage(clientA, messageToA);

        var messageToB = new EstablishConnectionMessage
        {
            RemoteToken = clientA,
            IceServers = _iceServerProvider.CreateIceServers(clientB),
            OwnDevice = ownDevice,
        };
        await _webSocketHandler.SendMessage(clientB, messageToB);

        _usageMetrics.ConnectionInitiated(path);
        _logger.LogDebug($"to {clientA} and {clientB}: Initiating connection.");
        return true;
    }
}
