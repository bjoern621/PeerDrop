using backend.WebSocketComponent.Common.Api.DTOs;
using MessageType = string;

namespace backend.WebSocketComponent.Logic.Api;

public interface IWebSocketHandler
{
    /// <summary>
    /// Raised after a client connection has been registered and its client
    /// token sent. Handlers may be asynchronous and are awaited.
    /// </summary>
    public event Func<ClientConnectedEvent, Task>? ClientConnected;

    /// <summary>
    /// Raised after a client connection has been removed. The argument is the
    /// disconnected client's token. Handlers may be asynchronous and are awaited.
    /// </summary>
    public event Func<string, Task>? ClientDisconnected;

    public bool RemoteTokenExists(string remoteToken);

    /// <summary>
    /// Sends a typed message to a specific client. The client ID must be valid and connected. Returns true if the message was sent successfully, false otherwise.
    /// </summary>
    public Task<bool> SendMessage(string clientToken, ITypedMessage message);
    public Task HandleConnect(HttpContext context);
    public void SubscribeToMessageType<T>(MessageType messageType, TypedMessageHandlerDelegate<T> handler);
    public List<string> GetClientTokensForUserId(int userId);
    /// <summary>
    /// Returns the user ID (account ID) for a given client token. If the client has no valid session / is not logged in, it returns null.
    /// This is guaranteed to be the correct user ID and can't be influenced by the client.
    /// </summary>
    public int? GetUserIdForClientToken(string clientToken);
}