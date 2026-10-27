using backend.TokenComponent.Facade.Api;
using backend.TokenComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Api;

namespace backend.TokenComponent.Facade.Impl;

public class TransportSubscriptions(IWebSocketTransport _transport, ITransportEventHandler _handler) : ITransportSubscriptions
{
    public void SubscribeToTransport()
    {
        _transport.ConnectionOpened += _handler.HandleConnectionOpened;
        _transport.MessageReceived += _handler.HandleMessage;
        _transport.ConnectionClosed += _handler.HandleConnectionClosed;
    }
}
