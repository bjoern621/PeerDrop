using backend.WebSocketComponent.Common.DTOs.Api;
using MessageType = string;

namespace backend.WebSocketComponent.Logic.Api;

public interface IWebSocketHandler
{
    public bool RemoteTokenExists(string remoteToken);

    /// <summary>
    /// Sends a typed message to a specific client. The client ID must be valid and connected. Returns true if the message was sent successfully, false otherwise.
    /// </summary>
    public Task<bool> SendMessage(string clientToken, ITypedMessage message);
    public Task HandleConnect(HttpContext context);
    public void SubscribeToMessageType<T>(MessageType messageType, TypedMessageHandlerDelegate<T> handler);
}