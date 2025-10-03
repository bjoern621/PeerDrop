using backend.SignalingComponent.Common.Api.DTOs;
using backend.SignalingComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.SignalingComponent.Logic.Impl;

public class SignalingService(IWebSocketHandler webSocketHandler, ILogger<SignalingService> logger) : ISignalingService
{
    private readonly IWebSocketHandler _webSocketHandler = webSocketHandler;

    public async Task HandleRemoteTokenMessage(string clientId, RemoteTokenMessage message)
    {
        logger.LogDebug($"from {clientId}: Local Token");
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
            logger.LogDebug($"to {clientId}: Remote token {remoteToken} does not exist");
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
            logger.LogDebug($"to {clientId}: SUCCESS: Remote token {remoteToken} exists");

            await _webSocketHandler.SendMessage(remoteToken, response);
            logger.LogDebug($"to {remoteToken}: Remote Token");
        }
    }

    public async Task HandleIceCandidateMessage(string clientId, IceCandidateMessage message)
    {
        logger.LogTrace($"from {clientId}: Local ICE Candidate");
        string remoteToken = message.RemoteToken;

        var response = new IceCandidateMessage
        {
            RemoteToken = clientId,
            IceCandidate = message.IceCandidate
        };

        await _webSocketHandler.SendMessage(remoteToken, response);
        logger.LogTrace($"to {remoteToken}: Remote ICE Candidate");
    }

    public async Task HandleSdpMessage(string clientId, SdpMessage message)
    {
        logger.LogTrace($"from {clientId}: Local SDP");
        string remoteToken = message.RemoteToken;

        var response = new SdpMessage
        {
            RemoteToken = clientId,
            Description = message.Description
        };

        await _webSocketHandler.SendMessage(remoteToken, response);
        logger.LogTrace($"to {remoteToken}: Remote SDP");
    }
}
