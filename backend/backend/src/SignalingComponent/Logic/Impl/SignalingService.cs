using backend.ConnectionComponent.Dataaccess.Api;
using backend.SignalingComponent.Common.Api.DTOs;
using backend.SignalingComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.SignalingComponent.Logic.Impl;

public class SignalingService(IWebSocketHandler webSocketHandler, IPairRepository pairRepository, ILogger<SignalingService> logger) : ISignalingService
{
    private readonly IWebSocketHandler _webSocketHandler = webSocketHandler;

    public async Task HandleIceCandidateMessage(string clientId, IceCandidateMessage message)
    {
        logger.LogTrace($"from {clientId}: Local ICE Candidate");
        string remoteToken = message.RemoteToken;

        if (!IsConnectedPair(clientId, remoteToken))
            return;

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

        if (!IsConnectedPair(clientId, remoteToken))
            return;

        var response = new SdpMessage
        {
            RemoteToken = clientId,
            Description = message.Description
        };

        await _webSocketHandler.SendMessage(remoteToken, response);
        logger.LogTrace($"to {remoteToken}: Remote SDP");
    }

    private bool IsConnectedPair(string clientId, string? remoteToken)
    {
        if (!string.IsNullOrEmpty(remoteToken) && pairRepository.AreConnected(clientId, remoteToken))
            return true;

        logger.LogDebug($"Signaling from {clientId} to {remoteToken}, but they are not connected. Dropping message.");
        return false;
    }
}
