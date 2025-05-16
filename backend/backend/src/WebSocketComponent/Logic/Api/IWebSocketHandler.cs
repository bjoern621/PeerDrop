using backend.Common;
using backend.WebSocketComponent.Common.DTOs;
namespace backend.WebSocketComponent.Logic.Api;


public interface IWebSocketHandler
{
    public bool RemoteTokenExists(string remoteToken);
    public Task<bool> SendMessage<T>(string clientToken, TypedMessage<T> message);
    public Task HandleConnect(HttpContext context);
    public void SubscribeToMessageType<T>(MessageType messageType, TypedMessageHandlerDelegate<T> handler);
}