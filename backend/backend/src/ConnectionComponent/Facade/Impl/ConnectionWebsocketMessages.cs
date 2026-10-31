using backend.ConnectionComponent.Common.Api.DTOs;
using backend.ConnectionComponent.Facade.Api;
using backend.ConnectionComponent.Logic.Api;
using backend.TokenComponent.Logic.Api;

namespace backend.ConnectionComponent.Facade.Impl;

public class ConnectionWebsocketMessages(IClientRegistry _clientRegistry, IPeerConnectionService _peerConnectionService) : IConnectionWebsocketMessages
{
    public void SubscribeToMessageHandlers()
    {
        _clientRegistry.SubscribeToMessageType<CloseConnectionMessage>(CloseConnectionMessage.TypeString, _peerConnectionService.HandleCloseConnection);

        _clientRegistry.SubscribeToMessageType<PeerConnectMessage>(PeerConnectMessage.TypeString, _peerConnectionService.HandlePeerConnect);

        _clientRegistry.SubscribeToMessageType<ResumeConnectionMessage>(ResumeConnectionMessage.TypeString, _peerConnectionService.HandleResumeConnection);

        _clientRegistry.ClientDisconnected += _peerConnectionService.HandleClientDisconnected;
    }
}
