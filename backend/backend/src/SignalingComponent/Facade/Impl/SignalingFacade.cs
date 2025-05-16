using backend.SignalingComponent.Common.DTOs;
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
        _webSocketHandler.SubscribeToMessageType<RemoteTokenMessage>(MessageType.RemoteToken,
            (clientId, message) => _signalingService.HandleRemoteTokenMessage(clientId, message));

        _webSocketHandler.SubscribeToMessageType<IceCandidateMessage>(MessageType.IceCandidate,
            (clientId, message) => _signalingService.HandleIceCandidateMessage(clientId, message));

        _webSocketHandler.SubscribeToMessageType<SdpMessage>(MessageType.SdpMessage,
            (clientId, message) => _signalingService.HandleSdpMessage(clientId, message));
        
        _webSocketHandler.SubscribeToMessageType<RemoteTokenMessage>(MessageType.CloseConnection,
            (clientId, message) => _signalingService.HandleCloseConnection(clientId, message));
    }
}