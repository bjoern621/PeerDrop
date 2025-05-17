using backend.Common;
using backend.SignalingComponent.Common.DTOs;
using backend.SignalingComponent.Logic.Api;
using backend.WebSocketComponent.Common.DTOs;
using backend.WebSocketComponent.Logic.Api;

namespace backend.SignalingComponent.Logic.Impl;

public class SignalingService : ISignalingService
{
    private readonly IWebSocketHandler _webSocketHandler;

    public SignalingService(IWebSocketHandler webSocketHandler)
    {
        _webSocketHandler = webSocketHandler;
    }

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

    public async Task HandleCloseConnection(string clientId, RemoteTokenMessage message)
    {
        Console.WriteLine($"from {clientId}: Close Connection");
        string remoteToken = message.RemoteToken;

        var response = new RemoteTokenMessage
        {
            RemoteToken = clientId
        };
        
        await _webSocketHandler.SendMessage(remoteToken, response);
        Console.WriteLine($"to {remoteToken}: Close Connection");
    }
}
