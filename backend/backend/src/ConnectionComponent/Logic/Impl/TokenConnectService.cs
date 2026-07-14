using backend.ConnectionComponent.Common.Api.DTOs;
using backend.ConnectionComponent.Dataaccess.Api;
using backend.ConnectionComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.ConnectionComponent.Logic.Impl;

public class TokenConnectService(
    IWebSocketHandler _webSocketHandler,
    ILogger<TokenConnectService> _logger,
    IOpenConnectionRequestRepository _openConnectionRequestRepository,
    IConnectionInitiationService _connectionInitiationService,
    IConnectionStateService _connectionStateService) : ITokenConnectService
{
    public async Task HandleConnectionRequest(string clientId, ConnectionRequestMessage message)
    {
        _logger.LogDebug($"from {clientId}: Connection Request");
        string remoteToken = message.RemoteToken;

        if (!_webSocketHandler.RemoteTokenExists(remoteToken))
        {
            var rejectedMessage = new ConnectionResponseMessage
            {
                Accepted = false,
                RemoteToken = remoteToken,
            };

            await _webSocketHandler.SendMessage(clientId, rejectedMessage);
            _logger.LogDebug($"to {clientId}: Connection Request Rejected: Remote token {remoteToken} does not exist");
            return;
        }

        // Adding silently replaces an existing request from the same client;
        // the previous target must also receive a fresh snapshot.
        _openConnectionRequestRepository.TryGetTarget(clientId, out var previousTarget);

        _openConnectionRequestRepository.Add(clientId, remoteToken);
        _logger.LogDebug($"Connection request from {clientId} to {remoteToken} is now open.");

        var forwardedConnectionRequest = new ConnectionRequestMessage
        {
            RemoteToken = clientId
        };

        await _webSocketHandler.SendMessage(remoteToken, forwardedConnectionRequest);
        _logger.LogDebug($"to {remoteToken}: Connection Request from {clientId}");

        await _connectionStateService.PushStateTo(clientId, remoteToken, previousTarget);
    }

    public async Task HandleConnectionResponse(string clientId, ConnectionResponseMessage message)
    {
        _logger.LogDebug($"from {clientId}: Connection Response");
        var requestingClientToken = message.RemoteToken;

        if (!_webSocketHandler.RemoteTokenExists(requestingClientToken))
        {
            // Client that sent the request completely disconnected while waiting for a response.
            // Or the client that sent the response made a mistake.
            _logger.LogDebug($"Connection response from {clientId} for unknown request {requestingClientToken}. Ignoring.");
            _openConnectionRequestRepository.TryRemove(requestingClientToken, out _); // Probably better to remove the request in disconnect handler or with timeout.
            return;
        }

        if (!_openConnectionRequestRepository.TryRemove(requestingClientToken, out var respondingClientToken) || respondingClientToken != clientId)
        {
            // The requesting client does not have an open request for this responding client.
            _logger.LogDebug($"Connection response from {clientId} for request {requestingClientToken} that does not match the open request. Ignoring.");
            return;
        }

        // Validation success

        // Forward the response to the requesting client.
        var messageForRequestingClient = new ConnectionResponseMessage
        {
            Accepted = message.Accepted,
            RemoteToken = clientId
        };
        await _webSocketHandler.SendMessage(requestingClientToken, messageForRequestingClient);
        _logger.LogDebug($"to {requestingClientToken}: Connection Response from {clientId} (Accepted: {message.Accepted})");

        // Tell clients that they should start the connection process.
        if (message.Accepted)
        {
            await _connectionInitiationService.InitiateConnection(requestingClientToken, clientId);
            _logger.LogDebug($"to {requestingClientToken} and {clientId}: Initiating connection.");
        }
        else
        {
            await _connectionStateService.PushStateTo(requestingClientToken, clientId);
        }
    }

    public async Task HandleConnectionRequestCancelled(string clientToken, ConnectionRequestCancelledMessage messageData)
    {
        _logger.LogDebug($"from {clientToken}: Connection Request Cancelled");
        // messageData.RemoteToken is intentionally ignored: a client can only
        // cancel its own open request, which is keyed by its own token.

        if (!_openConnectionRequestRepository.TryRemove(clientToken, out var remoteToken))
        {
            _logger.LogDebug($"Connection request from {clientToken} cancelled, but no open request found.");
            return;
        }

        // Both affected clients get a fresh snapshot: the requester's outgoing
        // target clears and the former target's incoming list shrinks. No
        // dedicated cancellation message is forwarded; the snapshot is the
        // single source of truth. PushStateTo skips clients that are no longer
        // connected, covering the case where the target already disconnected.
        await _connectionStateService.PushStateTo(clientToken, remoteToken);
    }

    public async Task HandleClientDisconnected(string clientToken)
    {
        // Drop the disconnected client's own open request, if any. The target
        // of that request must learn that the request is gone.
        _openConnectionRequestRepository.TryRemove(clientToken, out var ownRequestTarget);

        // Requesters waiting for the disconnected client would otherwise wait
        // forever. Reject their requests.
        var waitingRequesters = _openConnectionRequestRepository.FindAndRemoveRequestersForTarget(clientToken).ToList();

        var rejectionMessage = new ConnectionResponseMessage
        {
            Accepted = false,
            RemoteToken = clientToken,
        };

        foreach (var requester in waitingRequesters)
        {
            await _webSocketHandler.SendMessage(requester, rejectionMessage);
            _logger.LogDebug($"to {requester}: Connection Request Rejected: Target {clientToken} disconnected");
        }

        await _connectionStateService.PushStateTo([ownRequestTarget, .. waitingRequesters]);
    }

    public async Task HandleCloseConnection(string clientId, CloseConnectionMessage message)
    {
        _logger.LogDebug($"from {clientId}: Close Connection");
        string remoteToken = message.RemoteToken;

        var response = new CloseConnectionMessage
        {
            RemoteToken = clientId
        };

        await _webSocketHandler.SendMessage(remoteToken, response);
        _logger.LogDebug($"to {remoteToken}: Close Connection");
    }
}