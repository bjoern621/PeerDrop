using backend.TokenComponent.Common.Api.DTOs;
using backend.WebSocketComponent.Common.Api.DTOs;
using MessageType = string;

namespace backend.TokenComponent.Logic.Api;

/// <summary>
/// Names every connected client by its token and carries messages to and from it.
/// Tokens compare case-insensitively.
/// Can be called concurrently.
/// </summary>
public interface IClientRegistry
{
    /// <summary>
    /// Raised after a client got its token and the token message went out.
    /// Handlers may be asynchronous and are awaited.
    /// </summary>
    public event Func<ClientConnectedEvent, Task>? ClientConnected;

    /// <summary>
    /// Raised after a client gave up its token, by closing or by a later connection that reclaimed it.
    /// The argument is that token. Handlers may be asynchronous and are awaited.
    /// </summary>
    public event Func<string, Task>? ClientDisconnected;

    public bool RemoteTokenExists(string remoteToken);

    /// <summary>
    /// Returns false if no client holds the token or the send failed.
    /// </summary>
    public Task<bool> SendMessage(string clientToken, ITypedMessage message);

    /// <summary>
    /// Calls the handler with the sender's token for every message of the type.
    /// The handler should not be registered twice for the same type.
    /// </summary>
    public void SubscribeToMessageType<T>(MessageType messageType, TypedMessageHandlerDelegate<T> handler);

    public List<string> GetClientTokensForUserId(int userId);

    /// <summary>
    /// Returns the account of the client's session, null without a session or without the client.
    /// The client cannot influence it.
    /// </summary>
    public int? GetUserIdForClientToken(string clientToken);

    /// <summary>
    /// Returns true if both clients are connected and signed in with the same account, false otherwise.
    /// </summary>
    public bool AreSignedInWithSameAccount(string clientTokenA, string clientTokenB);

    /// <summary>
    /// Returns null if no client holds the token or its address could not be determined.
    /// </summary>
    public string? GetRemoteIpAddressForClientToken(string clientToken);

    /// <summary>
    /// Clients holding a token, split by whether the client holds a session.
    /// </summary>
    public (int SignedIn, int Anonymous) CountClients();
}
