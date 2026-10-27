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
    /// <summary>
    /// Accepts the WebSocket and serves it until it closes.
    /// The connection gets <paramref name="requestedToken"/> as its client token if no other connection holds it, a random token otherwise.
    /// A holder that answers no ping within a few seconds gets closed and hands the token over.
    /// A requested token outside <see cref="Common.Api.ClientTokenFormat"/> counts as no request.
    /// Uppercase letters count as lowercase.
    /// </summary>
    public Task HandleConnect(HttpContext context, string? requestedToken);
    public void SubscribeToMessageType<T>(MessageType messageType, TypedMessageHandlerDelegate<T> handler);
    public List<string> GetClientTokensForUserId(int userId);
    /// <summary>
    /// Returns the user ID (account ID) for a given client token. If the client has no valid session / is not logged in, it returns null.
    /// This is guaranteed to be the correct user ID and can't be influenced by the client.
    /// </summary>
    public int? GetUserIdForClientToken(string clientToken);

    /// <summary>
    /// Returns true if both clients are connected and signed in with the same account, false otherwise.
    /// </summary>
    public bool AreSignedInWithSameAccount(string clientTokenA, string clientTokenB);

    /// <summary>
    /// Returns the remote IP address the client connected from.
    /// Null if the client is not connected or the address could not be determined.
    /// </summary>
    public string? GetRemoteIpAddressForClientToken(string clientToken);

    /// <summary>
    /// Connected clients, split by whether the client holds a session.
    /// </summary>
    public (int SignedIn, int Anonymous) CountClients();
}