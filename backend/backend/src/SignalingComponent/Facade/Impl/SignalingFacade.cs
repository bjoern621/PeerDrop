using backend.SignalingComponent.Common.DTOs;
using backend.SignalingComponent.Facade.Api;
using backend.SignalingComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.SignalingComponent.Facade.Impl;

public class SignalingFacade : ISignalingFacade
{
    private readonly IWebSocketHandler _webSocketHandler;
    private readonly ISignalingService _signalingService;

    private const string REMOTE_TOKEN_MESSAGE_TYPE = "remote-token";
    private const string ICE_CANDIDATE_MESSAGE_TYPE = "ice-candidate";
    private const string SDP_MESSAGE_TYPE = "sdp-message";

    public SignalingFacade(IWebSocketHandler webSocketHandler, ISignalingService signalingService)
    {
        _webSocketHandler = webSocketHandler;
        _signalingService = signalingService;
    }

    public void SubscribeToMessageHandlers()
    {
        _webSocketHandler.SubscribeToMessageType<RemoteTokenMessage>(REMOTE_TOKEN_MESSAGE_TYPE,
            (clientId, message) => _signalingService.HandleRemoteTokenMessage(clientId, message));

        _webSocketHandler.SubscribeToMessageType<IceCandidateMessage>(ICE_CANDIDATE_MESSAGE_TYPE,
            (clientId, message) => _signalingService.HandleIceCandidateMessage(clientId, message));

        _webSocketHandler.SubscribeToMessageType<SdpMessage>(SDP_MESSAGE_TYPE,
            (clientId, message) => _signalingService.HandleSdpMessage(clientId, message));
    }
}