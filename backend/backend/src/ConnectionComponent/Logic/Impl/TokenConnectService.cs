using backend.ConnectionComponent.Common.Api.DTOs;
using backend.ConnectionComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.ConnectionComponent.Logic.Impl;

public class TokenConnectService(IWebSocketHandler webSocketHandler, ILogger<TokenConnectService> logger) : ITokenConnectService
{
    private readonly IWebSocketHandler _webSocketHandler = webSocketHandler;

    // This dictionary keeps track of open connection requests. It maps the requesting client token to the token of the client they are trying to connect to.
    private readonly Dictionary<string, string> openRequests = [];

    public async Task HandleConnectionRequest(string clientId, ConnectionRequestMessage message)
    {
        logger.LogDebug($"from {clientId}: Connection Request");
        string remoteToken = message.RemoteToken;

        if (!_webSocketHandler.RemoteTokenExists(remoteToken))
        {
            var rejectedMessage = new ConnectionResponseMessage
            {
                Accepted = false,
                RemoteToken = remoteToken,
            };

            await _webSocketHandler.SendMessage(clientId, rejectedMessage);
            logger.LogDebug($"to {clientId}: Connection Request Rejected: Remote token {remoteToken} does not exist");
            return;
        }

        openRequests[clientId] = remoteToken;
        logger.LogDebug($"Connection request from {clientId} to {remoteToken} is now open.");

        var forwardedConnectionRequest = new ConnectionRequestMessage
        {
            RemoteToken = clientId
        };

        await _webSocketHandler.SendMessage(remoteToken, forwardedConnectionRequest);
        logger.LogDebug($"to {remoteToken}: Connection Request from {clientId}");
    }

    public async Task HandleConnectionResponse(string clientId, ConnectionResponseMessage message)
    {
        logger.LogDebug($"from {clientId}: Connection Response");
        var requestingClientToken = message.RemoteToken;

        if (!_webSocketHandler.RemoteTokenExists(requestingClientToken))
        {
            // Client that sent the request completely disconnected while waiting for a response.
            // Or the client that sent the response made a mistake.
            logger.LogDebug($"Connection response from {clientId} for unknown request {requestingClientToken}. Ignoring.");
            openRequests.Remove(requestingClientToken); // Probably better to remove the request in disconnect handler or with timeout.
            return;
        }

        if (!openRequests.TryGetValue(requestingClientToken, out var respondingClientToken) || respondingClientToken != clientId)
        {
            // The requesting client does not have an open request for this responding client.
            logger.LogDebug($"Connection response from {clientId} for request {requestingClientToken} that does not match the open request. Ignoring.");
            return;
        }

        openRequests.Remove(requestingClientToken);

        // Forward the response to the requesting client.
        var messageForRequestingClient = new ConnectionResponseMessage
        {
            Accepted = message.Accepted,
            RemoteToken = clientId
        };
        await _webSocketHandler.SendMessage(requestingClientToken, messageForRequestingClient);
        logger.LogDebug($"to {requestingClientToken}: Connection Response from {clientId} (Accepted: {message.Accepted})");

        // Tell clients that they should start the connection process.
        if (message.Accepted)
        {
            var establishConnectionMessageToRequestingClient = new EstablishConnectionMessage
            {
                RemoteToken = clientId
            };

            _ = _webSocketHandler.SendMessage(requestingClientToken, establishConnectionMessageToRequestingClient);
            logger.LogDebug($"to {requestingClientToken}: Establish Connection with {clientId}");

            var establishConnectionMessageToRespondingClient = new EstablishConnectionMessage
            {
                RemoteToken = message.RemoteToken
            };

            _ = _webSocketHandler.SendMessage(clientId, establishConnectionMessageToRespondingClient);
            logger.LogDebug($"to {clientId}: Establish Connection with {requestingClientToken}");
        }
    }

    public async Task HandleConnectionRequestCancelled(string clientToken, ConnectionRequestCancelledMessage messageData)
    {
        logger.LogDebug($"from {clientToken}: Connection Request Cancelled");
        // Note: The received messageData.RemoteToken is not checked / used. This means that the requesting client can cancel their active request even if their messageData is faulty.

        openRequests.TryGetValue(clientToken, out var remoteToken);
        if (remoteToken == null)
        {
            // The requesting client does not have an open request.
            logger.LogDebug($"Connection request from {clientToken} cancelled, but no open request found.");
            return;
        }

        openRequests.Remove(clientToken);

        if (!_webSocketHandler.RemoteTokenExists(remoteToken))
        {
            // The requesting client cancelled their request, but the remote token does not exist.
            // This can happen if the remote client disconnected while the request was open.
            logger.LogDebug($"Connection request from {clientToken} cancelled, but remote token {remoteToken} does not exist.");
            return;
        }

        // Forward the cancellation to the client that was requested.
        var msg = new ConnectionRequestCancelledMessage
        {
            RemoteToken = clientToken
        };

        await _webSocketHandler.SendMessage(remoteToken, msg);
        logger.LogDebug($"to {remoteToken}: Connection Request Cancelled from {clientToken}");
    }

    public async Task HandleCloseConnection(string clientId, CloseConnectionMessage message)
    {
        logger.LogDebug($"from {clientId}: Close Connection");
        string remoteToken = message.RemoteToken;

        var response = new CloseConnectionMessage
        {
            RemoteToken = clientId
        };

        await _webSocketHandler.SendMessage(remoteToken, response);
        logger.LogDebug($"to {remoteToken}: Close Connection");
    }
}