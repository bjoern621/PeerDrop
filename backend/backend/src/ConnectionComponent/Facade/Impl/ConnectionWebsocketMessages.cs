using backend.ConnectionComponent.Common.Api.DTOs;
using backend.ConnectionComponent.Facade.Api;
using backend.ConnectionComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.ConnectionComponent.Facade.Impl;

public class ConnectionWebsocketMessages(IWebSocketHandler _webSocketHandler, ITokenConnectService _tokenConnectService, IQuickConnectService _quickConnectService) : IConnectionWebsocketMessages
{
    public void SubscribeToMessageHandlers()
    {
        _webSocketHandler.SubscribeToMessageType<CloseConnectionMessage>(CloseConnectionMessage.TypeString, _tokenConnectService.HandleCloseConnection);

        _webSocketHandler.SubscribeToMessageType<ConnectionRequestMessage>(ConnectionRequestMessage.TypeString, _tokenConnectService.HandleConnectionRequest);

        _webSocketHandler.SubscribeToMessageType<ConnectionResponseMessage>(ConnectionResponseMessage.TypeString, _tokenConnectService.HandleConnectionResponse);

        _webSocketHandler.SubscribeToMessageType<ConnectionRequestCancelledMessage>(ConnectionRequestCancelledMessage.TypeString, _tokenConnectService.HandleConnectionRequestCancelled);

        _webSocketHandler.SubscribeToMessageType<QuickConnectMessage>(QuickConnectMessage.TypeString, _quickConnectService.HandleQuickConnectMessage);
    }
}