using backend.ConnectionComponent.Common.Api.DTOs;
using backend.ConnectionComponent.Logic.Api;
using backend.LanComponent.Common.Api.DTOs;
using backend.LanComponent.Facade.Api;
using backend.LanComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.LanComponent.Facade.Impl;

public class LanEventSubscriptions(
    IWebSocketHandler _webSocketHandler,
    IConnectionInitiationService _connectionInitiationService,
    ILanDiscoveryService _lanDiscoveryService) : ILanEventSubscriptions
{
    public void SubscribeToEvents()
    {
        _webSocketHandler.ClientConnected += _lanDiscoveryService.HandleClientConnected;
        _webSocketHandler.ClientDisconnected += _lanDiscoveryService.HandleClientDisconnected;

        _webSocketHandler.SubscribeToMessageType<RequestLanPeersMessage>(
            RequestLanPeersMessage.TypeString, _lanDiscoveryService.HandleLanPeersRequest);

        // Busy tracking: a peer connection starts when the server tells two
        // clients to establish one and ends when either sends a close message
        // (a plain disconnect is covered by ClientDisconnected above).
        _connectionInitiationService.ConnectionEstablished += _lanDiscoveryService.HandleConnectionEstablished;

        _webSocketHandler.SubscribeToMessageType<CloseConnectionMessage>(
            CloseConnectionMessage.TypeString,
            (clientToken, _) => _lanDiscoveryService.HandleConnectionClosed(clientToken));
    }
}
