using System.Text.Json;
using backend.WebSocketComponent.Common.Api;

namespace backend.TokenComponent.Logic.Api;

/// <summary>
/// Turns the transport's connections into clients with tokens.
/// Expects the transport's ordering: opened first, messages of one connection one at a time, closed last.
/// </summary>
public interface ITransportEventHandler
{
    /// <summary>
    /// Waits for the connection's hello. A connection without one in time gets closed.
    /// </summary>
    public Task HandleConnectionOpened(Guid connectionId, ClientConnectionInfo info);

    /// <summary>
    /// Assigns a token on the first message, which has to be a hello.
    /// Any other first message closes the connection.
    /// Forwards every later message to the subscribers of its type, with the sender's token.
    /// </summary>
    public Task HandleMessage(Guid connectionId, string messageType, JsonElement message);

    /// <summary>
    /// Frees the connection's token, unless a later connection reclaimed it.
    /// </summary>
    public Task HandleConnectionClosed(Guid connectionId);
}
