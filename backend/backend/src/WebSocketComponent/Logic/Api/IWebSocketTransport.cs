using System.Text.Json;
using backend.WebSocketComponent.Common.Api;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.WebSocketComponent.Logic.Api;

/// <summary>
/// Carries messages over WebSocket connections, each named by a connection ID that the transport hands out.
/// Keeps every connection alive with pings and drops one that stops answering.
/// Knows nothing of client tokens.
/// Event handlers may be asynchronous and are awaited.
/// </summary>
public interface IWebSocketTransport
{
    /// <summary>
    /// Raised once the socket is accepted, before its first message.
    /// </summary>
    public event Func<Guid, ClientConnectionInfo, Task>? ConnectionOpened;

    /// <summary>
    /// Raised for every message with a type and a msg field, in arrival order.
    /// The next message of the same connection waits for the handlers.
    /// The JsonElement stays valid until the handlers return.
    /// </summary>
    public event Func<Guid, string, JsonElement, Task>? MessageReceived;

    /// <summary>
    /// Raised once after the connection closed, after its last <see cref="MessageReceived"/>.
    /// </summary>
    public event Func<Guid, Task>? ConnectionClosed;

    /// <summary>
    /// Accepts the WebSocket and serves it until it closes.
    /// </summary>
    public Task HandleConnect(HttpContext context);

    /// <summary>
    /// Returns false if the connection is gone or the send failed.
    /// </summary>
    public Task<bool> SendMessage(Guid connectionId, ITypedMessage message);

    /// <summary>
    /// Aborts the connection. <see cref="ConnectionClosed"/> follows.
    /// Nothing happens if the connection is gone.
    /// </summary>
    public void Close(Guid connectionId);
}
