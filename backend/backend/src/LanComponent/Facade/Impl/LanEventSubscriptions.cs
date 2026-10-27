using backend.LanComponent.Common.Api.DTOs;
using backend.LanComponent.Facade.Api;
using backend.LanComponent.Logic.Api;
using backend.TokenComponent.Logic.Api;

namespace backend.LanComponent.Facade.Impl;

public class LanEventSubscriptions(
    IClientRegistry _clientRegistry,
    ILanDiscoveryService _lanDiscoveryService) : ILanEventSubscriptions
{
    public void SubscribeToEvents()
    {
        _clientRegistry.ClientConnected += _lanDiscoveryService.HandleClientConnected;
        _clientRegistry.ClientDisconnected += _lanDiscoveryService.HandleClientDisconnected;

        _clientRegistry.SubscribeToMessageType<RequestLanPeersMessage>(
            RequestLanPeersMessage.TypeString, _lanDiscoveryService.HandleLanPeersRequest);

        _clientRegistry.SubscribeToMessageType<LanDiscoveryStateMessage>(
            LanDiscoveryStateMessage.TypeString, _lanDiscoveryService.HandleLanDiscoveryState);
    }
}
