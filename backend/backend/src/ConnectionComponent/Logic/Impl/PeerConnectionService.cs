using backend.ConnectionComponent.Common.Api.DTOs;
using backend.ConnectionComponent.Dataaccess.Api;
using backend.ConnectionComponent.Logic.Api;
using backend.TokenComponent.Logic.Api;

namespace backend.ConnectionComponent.Logic.Impl;

public class PeerConnectionService(
    IClientRegistry _clientRegistry,
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
            || !_clientRegistry.RemoteTokenExists(targetToken))
        {
            _logger.LogDebug($"Peer connect from {clientToken} to {targetToken}, but the target is offline or the sender itself. Ignoring.");
            return;
        }

        string path;
        if (_clientRegistry.AreSignedInWithSameAccount(clientToken, targetToken))
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

        await _clientRegistry.SendMessage(message.RemoteToken, new CloseConnectionMessage { RemoteToken = clientToken });
        _logger.LogDebug($"to {message.RemoteToken}: Close Connection");
    }

    public async Task HandleResumeConnection(string clientToken, ResumeConnectionMessage message)
    {
        _logger.LogDebug($"from {clientToken}: Resume Connection");

        if (string.IsNullOrEmpty(message.RemoteToken))
            return;

        var partnerToken = message.RemoteToken.ToLowerInvariant();

        if (string.Equals(partnerToken, clientToken, StringComparison.OrdinalIgnoreCase)
            || !_clientRegistry.RemoteTokenExists(partnerToken)
            || _pairRepository.AreConnected(clientToken, partnerToken))
        {
            _logger.LogDebug($"Resume connection from {clientToken} to {partnerToken}, but the partner is offline, the sender itself or connected. Ignoring.");
            return;
        }

        if (_pairRepository.ClaimResume(clientToken, partnerToken) == ResumeClaim.Repeated)
        {
            _logger.LogDebug($"Resume connection from {clientToken} to {partnerToken} repeated. Ignoring.");
            return;
        }

        await _clientRegistry.SendMessage(partnerToken, new ResumeConnectionMessage { RemoteToken = clientToken });
        _logger.LogDebug($"to {partnerToken}: Resume Connection");
    }

    public async Task HandleClientDisconnected(string clientToken)
    {
        var partners = _pairRepository.RemoveClient(clientToken);

        foreach (var partner in partners)
        {
            await _clientRegistry.SendMessage(partner, new CloseConnectionMessage { RemoteToken = clientToken, Gone = true });
            _logger.LogDebug($"to {partner}: Close Connection: Partner {clientToken} disconnected");
        }
    }
}
