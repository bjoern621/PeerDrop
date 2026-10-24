using backend.LanComponent.Common.Api.DTOs;
using backend.LanComponent.Facade.Api;
using backend.LanComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.LanComponent.Facade.Impl;

public class LanEventSubscriptions(
    IWebSocketHandler _webSocketHandler,
    ILanDiscoveryService _lanDiscoveryService) : ILanEventSubscriptions
{
    public void SubscribeToEvents()
    {
        _webSocketHandler.ClientConnected += _lanDiscoveryService.HandleClientConnected;
        _webSocketHandler.ClientDisconnected += _lanDiscoveryService.HandleClientDisconnected;

        _webSocketHandler.SubscribeToMessageType<RequestLanPeersMessage>(
            RequestLanPeersMessage.TypeString, _lanDiscoveryService.HandleLanPeersRequest);

        _webSocketHandler.SubscribeToMessageType<LanDiscoveryStateMessage>(
            LanDiscoveryStateMessage.TypeString, _lanDiscoveryService.HandleLanDiscoveryState);
    }
}
