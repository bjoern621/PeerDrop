using backend.SignalingComponent.Common.DTOs;
using backend.SignalingComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.SignalingComponent.Logic.Impl;

public class SignalingService(IWebSocketHandler webSocketHandler) : ISignalingService
{
    private readonly IWebSocketHandler _webSocketHandler = webSocketHandler;

    // This dictionary keeps track of open connection requests. It maps the requesting client token to the token of the client they are trying to connect to.
    private readonly Dictionary<string, string> openRequests = [];

    public async Task HandleRemoteTokenMessage(string clientId, RemoteTokenMessage message)
    {
        Console.WriteLine($"from {clientId}: Local Token");
        string remoteToken = message.RemoteToken;
        string requestId = message.RequestId!;

        if (!_webSocketHandler.RemoteTokenExists(remoteToken))
        {
            var exception = new ErrorMessage
            {
                RequestId = requestId,
                Description = $"Remote token {remoteToken} does not exist"
            };

            await _webSocketHandler.SendMessage(clientId, exception);
            Console.WriteLine($"to {clientId}: ERROR: Remote token {remoteToken} does not exist");
        }
        else
        {
            var success = new SuccessMessage
            {
                RequestId = requestId,
                Description = $"Token {remoteToken} exists, OK"
            };

            var response = new RemoteTokenMessage
            {
                RequestId = requestId,
                RemoteToken = clientId
            };

            await _webSocketHandler.SendMessage(clientId, success);
            Console.WriteLine($"to {clientId}: SUCCESS: Remote token {remoteToken} exists");

            await _webSocketHandler.SendMessage(remoteToken, response);
            Console.WriteLine($"to {remoteToken}: Remote Token");
        }
    }

    public async Task HandleIceCandidateMessage(string clientId, IceCandidateMessage message)
    {
        Console.WriteLine($"from {clientId}: Local ICE Candidate");
        string remoteToken = message.RemoteToken;

        var response = new IceCandidateMessage
        {
            RemoteToken = clientId,
            IceCandidate = message.IceCandidate
        };

        await _webSocketHandler.SendMessage(remoteToken, response);
        Console.WriteLine($"to {remoteToken}: Remote ICE Candidate");
    }

    public async Task HandleSdpMessage(string clientId, SdpMessage message)
    {
        Console.WriteLine($"from {clientId}: Local SDP");
        string remoteToken = message.RemoteToken;

        var response = new SdpMessage
        {
            RemoteToken = clientId,
            Description = message.Description
        };

        await _webSocketHandler.SendMessage(remoteToken, response);
        Console.WriteLine($"to {remoteToken}: Remote SDP");
    }

    public async Task HandleCloseConnection(string clientId, CloseConnectionMessage message)
    {
        Console.WriteLine($"from {clientId}: Close Connection");
        string remoteToken = message.RemoteToken;

        var response = new CloseConnectionMessage
        {
            RemoteToken = clientId
        };

        await _webSocketHandler.SendMessage(remoteToken, response);
        Console.WriteLine($"to {remoteToken}: Close Connection");
    }

    public async Task HandleConnectionRequest(string clientId, ConnectionRequestMessage message)
    {
        string remoteToken = message.RemoteToken;

        if (!_webSocketHandler.RemoteTokenExists(remoteToken))
        {
            var rejectedMessage = new ConnectionResponseMessage
            {
                Accepted = false,
                RemoteToken = remoteToken,
            };

            await _webSocketHandler.SendMessage(clientId, rejectedMessage);

            return;
        }

        openRequests[clientId] = remoteToken;

        var forwardedConnectionRequest = new ConnectionRequestMessage
        {
            RemoteToken = clientId
        };

        await _webSocketHandler.SendMessage(remoteToken, forwardedConnectionRequest);
    }

    public async Task HandleConnectionResponse(string clientId, ConnectionResponseMessage message)
    {
        var requestingClientToken = message.RemoteToken;

        if (!_webSocketHandler.RemoteTokenExists(requestingClientToken))
        {
            // Client that sent the request completely disconnected while waiting for a response.
            // Or the client that sent the response made a mistake.
            openRequests.Remove(requestingClientToken); // Probably better to remove the request in disconnect handler or with timeout.
            return;
        }

        if (!openRequests.TryGetValue(requestingClientToken, out var respondingClientToken) || respondingClientToken != clientId)
        {
            // The requesting client does not have an open request for this responding client.
            // Console.WriteLine($"Connection response from {clientId} for unknown request {requestingClientToken}. Ignoring.");
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

        // Tell clients that they should start the connection process.
        if (message.Accepted)
        {
            var establishConnectionMessageToRequestingClient = new EstablishConnectionMessage
            {
                RemoteToken = clientId
            };

            _ = _webSocketHandler.SendMessage(requestingClientToken, establishConnectionMessageToRequestingClient);

            var establishConnectionMessageToRespondingClient = new EstablishConnectionMessage
            {
                RemoteToken = message.RemoteToken
            };

            _ = _webSocketHandler.SendMessage(clientId, establishConnectionMessageToRespondingClient);
        }
    }

    public async Task HandleConnectionRequestCancelled(string clientToken, ConnectionRequestCancelledMessage messageData)
    {
        // Note: The received messageData.RemoteToken is not checked / used. This means that the requesting client can cancel their active request even if their messageData is faulty.

        openRequests.TryGetValue(clientToken, out var remoteToken);
        if (remoteToken == null)
        {
            // The requesting client does not have an open request.
            return;
        }

        openRequests.Remove(clientToken);

        if (!_webSocketHandler.RemoteTokenExists(remoteToken))
        {
            // The requesting client cancelled their request, but the remote token does not exist.
            // This can happen if the remote client disconnected while the request was open.
            return;
        }

        // Console.WriteLine($"Connection request from {clientToken} cancelled.");

        // Forward the cancellation to the client that was requested.
        var msg = new ConnectionRequestCancelledMessage
        {
            RemoteToken = clientToken
        };

        await _webSocketHandler.SendMessage(remoteToken, msg);
    }
}
