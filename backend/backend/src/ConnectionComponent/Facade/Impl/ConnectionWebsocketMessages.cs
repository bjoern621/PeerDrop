using backend.ConnectionComponent.Common.Api.DTOs;
using backend.ConnectionComponent.Facade.Api;
using backend.ConnectionComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.ConnectionComponent.Facade.Impl;

public class ConnectionWebsocketMessages(IWebSocketHandler _webSocketHandler, IPeerConnectionService _peerConnectionService) : IConnectionWebsocketMessages
{
    public void SubscribeToMessageHandlers()
    {
        _webSocketHandler.SubscribeToMessageType<CloseConnectionMessage>(CloseConnectionMessage.TypeString, _peerConnectionService.HandleCloseConnection);

        _webSocketHandler.SubscribeToMessageType<PeerConnectMessage>(PeerConnectMessage.TypeString, _peerConnectionService.HandlePeerConnect);

        _webSocketHandler.ClientDisconnected += _peerConnectionService.HandleClientDisconnected;
    }
}
