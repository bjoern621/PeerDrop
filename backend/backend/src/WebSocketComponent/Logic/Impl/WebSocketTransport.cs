using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using backend.WebSocketComponent.Common.Api;
using backend.WebSocketComponent.Common.Api.DTOs;
using backend.WebSocketComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Types;

namespace backend.WebSocketComponent.Logic.Impl;

public class WebSocketTransport : IWebSocketTransport
{
    // Fits a text of 1 MiB as base64 ciphertext together with its envelope.
    public const int MaxMessageBytes = 2 * 1024 * 1024;
    private const int ReceiveBufferBytes = 16 * 1024;
    // A client that drops off without closing (lost network, sleeping device) counts as disconnected
    // once a ping goes unanswered for PongTimeout.
    private static readonly TimeSpan PingInterval = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan PongTimeout = TimeSpan.FromSeconds(15);
    // Browsers hide the WebSocket ping frames from scripts, so the client sends its own and expects a PongMessage.
    private const string PingMessageType = "ping";

    private readonly ConcurrentDictionary<Guid, Connection> _connections = new();

    public event Func<Guid, ClientConnectionInfo, Task>? ConnectionOpened;
    public event Func<Guid, string, JsonElement, Task>? MessageReceived;
    public event Func<Guid, Task>? ConnectionClosed;

    public async Task HandleConnect(HttpContext context)
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        using var webSocket = await context.WebSockets.AcceptWebSocketAsync(new WebSocketAcceptContext
        {
            KeepAliveInterval = PingInterval,
            KeepAliveTimeout = PongTimeout,
        });
        var connectionId = Guid.NewGuid();
        var connection = new Connection { WebSocket = webSocket, Info = InfoOf(context) };
        _connections[connectionId] = connection;

        await Raise(ConnectionOpened, handler => handler(connectionId, connection.Info));

        await ListenForMessages(webSocket, connectionId);

        _connections.TryRemove(connectionId, out _);

        await Raise(ConnectionClosed, handler => handler(connectionId));
    }

    private static ClientConnectionInfo InfoOf(HttpContext context)
    {
        var userId = int.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier), out var parsedUserId)
            ? parsedUserId
            : (int?)null;
        var userAgent = context.Request.Headers.UserAgent.ToString();

        return new ClientConnectionInfo(
            userId,
            context.Connection.RemoteIpAddress?.ToString(),
            userAgent.Length > 0 ? userAgent : null);
    }

    private static async Task Raise<THandler>(THandler? handlers, Func<THandler, Task> invoke) where THandler : Delegate
    {
        if (handlers == null)
            return;

        foreach (var handler in handlers.GetInvocationList().Cast<THandler>())
        {
            await invoke(handler);
        }
    }

    public async Task<bool> SendMessage(Guid connectionId, ITypedMessage message)
    {
        if (!_connections.TryGetValue(connectionId, out var connection))
            return false;

        var messageBytes = Encoding.UTF8.GetBytes(message.ToJson());

        await connection.SendLock.WaitAsync();
        try
        {
            await connection.WebSocket.SendAsync(
                new ArraySegment<byte>(messageBytes),
                WebSocketMessageType.Text,
                true,
                CancellationToken.None);
            return true;
        }
        catch (Exception)
        {
            return false;
        }
        finally
        {
            connection.SendLock.Release();
        }
    }

    public void Close(Guid connectionId)
    {
        if (_connections.TryGetValue(connectionId, out var connection))
            connection.WebSocket.Abort();
    }

    /// <summary>
    /// Receives messages until the connection closes and raises <see cref="MessageReceived"/> for each.
    /// Closes the connection on a message that is too large or lacks a type and a msg field.
    /// </summary>
    private async Task ListenForMessages(WebSocket webSocket, Guid connectionId)
    {
        var buffer = new byte[ReceiveBufferBytes];

        while (webSocket.State == WebSocketState.Open)
        {
            var (messageJson, closeStatus) = await ReceiveMessage(webSocket, buffer, MaxMessageBytes);

            if (closeStatus != null)
            {
                CloseConnection(webSocket, closeStatus.Value);
                return;
            }

            if (messageJson == null)
                return;

            try
            {
                using var document = JsonDocument.Parse(messageJson);
                var root = document.RootElement;

                if (!root.TryGetProperty("type", out var typeElement) ||
                    typeElement.ValueKind != JsonValueKind.String ||
                    !root.TryGetProperty("msg", out var msgElement))
                {
                    CloseConnection(webSocket, WebSocketCloseStatus.InvalidPayloadData);
                    return;
                }

                var messageType = typeElement.GetString();

                if (string.IsNullOrEmpty(messageType))
                {
                    CloseConnection(webSocket, WebSocketCloseStatus.InvalidPayloadData);
                    return;
                }

                if (messageType == PingMessageType)
                {
                    await SendMessage(connectionId, new PongMessage());
                    continue;
                }

                await Raise(MessageReceived, handler => handler(connectionId, messageType, msgElement));
            }
            catch (JsonException)
            {
                CloseConnection(webSocket, WebSocketCloseStatus.InvalidPayloadData);
                return;
            }
        }

        CloseConnection(webSocket);
    }

    /// <summary>
    /// Receives one message, assembled from as many frames as it spans.
    /// Returns the message text, or the status to close the connection with:
    /// NormalClosure once the peer closes, MessageTooBig once the message exceeds <paramref name="maxMessageBytes"/>.
    /// Returns neither if the peer dropped the connection without the close handshake.
    /// </summary>
    public static async Task<(string? Message, WebSocketCloseStatus? CloseStatus)> ReceiveMessage(
        WebSocket webSocket, byte[] buffer, int maxMessageBytes)
    {
        using var message = new MemoryStream();

        while (true)
        {
            WebSocketReceiveResult result;
            try
            {
                result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            }
            catch (OperationCanceledException)
            {
                // "The remote party closed the WebSocket connection without completing the close handshake."
                return (null, null);
            }
            catch (WebSocketException)
            {
                // "The remote party closed the WebSocket connection without completing the close handshake."
                return (null, null);
            }

            if (result.MessageType == WebSocketMessageType.Close)
                return (null, WebSocketCloseStatus.NormalClosure);

            if (message.Length + result.Count > maxMessageBytes)
                return (null, WebSocketCloseStatus.MessageTooBig);

            message.Write(buffer, 0, result.Count);

            if (result.EndOfMessage)
                return (Encoding.UTF8.GetString(message.GetBuffer(), 0, (int)message.Length), null);
        }
    }

    private static void CloseConnection(WebSocket webSocket,
        WebSocketCloseStatus closeStatus = WebSocketCloseStatus.NormalClosure)
    {
        webSocket.CloseAsync(closeStatus, null, CancellationToken.None);
    }
}
