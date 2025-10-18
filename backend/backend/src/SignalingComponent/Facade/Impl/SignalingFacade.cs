using backend.SignalingComponent.Common.Api.DTOs;
using backend.SignalingComponent.Facade.Api;
using backend.SignalingComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.SignalingComponent.Facade.Impl;

public class SignalingFacade : ISignalingFacade
{
    private readonly IWebSocketHandler _webSocketHandler;
    private readonly ISignalingService _signalingService;

    public SignalingFacade(IWebSocketHandler webSocketHandler, ISignalingService signalingService)
    {
        _webSocketHandler = webSocketHandler;
        _signalingService = signalingService;
    }

    public void SubscribeToMessageHandlers()
    {
        _webSocketHandler.SubscribeToMessageType<RemoteTokenMessage>(RemoteTokenMessage.TypeString, _signalingService.HandleRemoteTokenMessage);

        _webSocketHandler.SubscribeToMessageType<IceCandidateMessage>(IceCandidateMessage.TypeString, _signalingService.HandleIceCandidateMessage);

        _webSocketHandler.SubscribeToMessageType<SdpMessage>(SdpMessage.TypeString, _signalingService.HandleSdpMessage);
    }
}