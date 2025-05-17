using backend.Common;
using backend.WebSocketComponent.Common.DTOs;
using MessageType = string;
namespace backend.WebSocketComponent.Logic.Api;


public interface IWebSocketHandler
{
    public bool RemoteTokenExists(string remoteToken);
    public Task<bool> SendMessage(string clientToken, ITypedMessage message);
    public Task HandleConnect(HttpContext context);
    public void SubscribeToMessageType<T>(MessageType messageType, TypedMessageHandlerDelegate<T> handler);
}