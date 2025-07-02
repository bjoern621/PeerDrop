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
        _webSocketHandler.SubscribeToMessageType<RemoteTokenMessage>(RemoteTokenMessage.TypeString,
            (clientId, message) => _signalingService.HandleRemoteTokenMessage(clientId, message));

        _webSocketHandler.SubscribeToMessageType<IceCandidateMessage>(IceCandidateMessage.TypeString,
            (clientId, message) => _signalingService.HandleIceCandidateMessage(clientId, message));

        _webSocketHandler.SubscribeToMessageType<SdpMessage>(SdpMessage.TypeString,
            (clientId, message) => _signalingService.HandleSdpMessage(clientId, message));

        _webSocketHandler.SubscribeToMessageType<CloseConnectionMessage>(CloseConnectionMessage.TypeString,
            (clientId, message) => _signalingService.HandleCloseConnection(clientId, message));

        _webSocketHandler.SubscribeToMessageType<ConnectionRequestMessage>(ConnectionRequestMessage.TypeString, _signalingService.HandleConnectionRequest);

        _webSocketHandler.SubscribeToMessageType<ConnectionResponseMessage>(ConnectionResponseMessage.TypeString, _signalingService.HandleConnectionResponse);

        _webSocketHandler.SubscribeToMessageType<ConnectionRequestCancelledMessage>(ConnectionRequestCancelledMessage.TypeString, _signalingService.HandleConnectionRequestCancelled);

        _webSocketHandler.SubscribeToMessageType<QuickConnectMessage>(QuickConnectMessage.TypeString, _signalingService.HandleQuickConnectMessage);
    }
}