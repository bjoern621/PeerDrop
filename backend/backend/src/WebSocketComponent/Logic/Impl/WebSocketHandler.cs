using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net.WebSockets;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using backend.WebSocketComponent.Common.Api.DTOs;
using backend.WebSocketComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Types;
using static backend.WebSocketComponent.Common.Api.ClientTokenFormat;

namespace backend.WebSocketComponent.Logic.Impl;

using MessageType = string;

public class WebSocketHandler(ILogger<WebSocketHandler> logger) : IWebSocketHandler
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
    // A connection that requests a held token waits this long for the holder to answer a ping.
    // A half-open holder answers none until the keepalive above drops it, which takes up to PingInterval + PongTimeout.
    private static readonly TimeSpan TakeoverProbeTimeout = TimeSpan.FromSeconds(2);
    private static readonly TimeSpan TakeoverReleaseTimeout = TimeSpan.FromSeconds(5);

    // String is the client token. Case-insensitive so tokens entered with any casing map to the same connection.
    private readonly ConcurrentDictionary<string, RuntimeClientInformation> ActiveConnections = new(StringComparer.OrdinalIgnoreCase);
    private readonly Random Random = new();
    private readonly ConcurrentDictionary<MessageType, List<MessageHandlerDelegate>> MessageHandlers = new();

    public event Func<ClientConnectedEvent, Task>? ClientConnected;
    public event Func<string, Task>? ClientDisconnected;

    public bool RemoteTokenExists(string remoteToken)
    {
        return ActiveConnections.ContainsKey(remoteToken);
    }

    /// <summary>
    /// Generates a client token as a proquint: a random 16-bit value encoded into a pronounceable
    /// five-letter con-vo-con-vo-con syllable (e.g. "kuras"), following the Wilkerson specification.
    /// The value maps losslessly to and from the token.
    /// </summary>
    private string GenerateClientToken()
    {
        int value = Random.Next(0x10000); // 16 bits

        return new string([
            ProquintConsonants[(value >> 12) & 0xF],
            ProquintVowels[(value >> 10) & 0x3],
            ProquintConsonants[(value >> 6) & 0xF],
            ProquintVowels[(value >> 4) & 0x3],
            ProquintConsonants[value & 0xF],
        ]);
    }

    /// <summary>
    /// Adds the WebSocket connection to the active connections list and returns its client token.
    /// The connection gets the requested token if it fits the format and <see cref="ClaimToken"/> succeeds, a generated unique token otherwise.
    /// </summary>
    private async Task<(string ClientToken, RuntimeClientInformation Client)> AddConnection(
        WebSocket webSocket, HttpContext context, string? requestedToken)
    {
        int? userId = null;
        var userIdClaim = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(userIdClaim, out int parsedUserId))
        {
            userId = parsedUserId;
        }

        var runtimeInformation = new RuntimeClientInformation
        {
            WebSocket = webSocket,
            UserId = userId, // User ID from session, may be null if not logged in
            RemoteIpAddress = context.Connection.RemoteIpAddress?.ToString(),
            UserAgent = context.Request.Headers.UserAgent.ToString() is { Length: > 0 } ua ? ua : null
        };

        requestedToken = requestedToken?.ToLowerInvariant();
        if (requestedToken != null && IsValidRequestedToken(requestedToken)
            && await ClaimToken(requestedToken, runtimeInformation))
        {
            return (requestedToken, runtimeInformation);
        }

        string clientToken;
        do
        {
            clientToken = GenerateClientToken();
        } while (!ActiveConnections.TryAdd(clientToken, runtimeInformation));

        return (clientToken, runtimeInformation);
    }

    /// <summary>
    /// Adds the claimant under the token if no connection holds it.
    /// A holder that answers no ping within <see cref="TakeoverProbeTimeout"/> gets aborted, and the claimant takes the token once the holder closed.
    /// Returns false if the holder answers, outlasts <see cref="TakeoverReleaseTimeout"/> or another connection takes the token first.
    /// </summary>
    private async Task<bool> ClaimToken(string token, RuntimeClientInformation claimant)
    {
        if (ActiveConnections.TryAdd(token, claimant))
            return true;
        if (!ActiveConnections.TryGetValue(token, out var holder))
            return ActiveConnections.TryAdd(token, claimant);

        var answer = holder.NextMessage;
        await SendMessage(token, new PingMessage());
        await Task.WhenAny(answer, holder.Closed.Task, Task.Delay(TakeoverProbeTimeout));

        if (!holder.Closed.Task.IsCompleted)
        {
            if (answer.IsCompleted)
                return false;

            holder.WebSocket.Abort();
            await Task.WhenAny(holder.Closed.Task, Task.Delay(TakeoverReleaseTimeout));
        }

        return ActiveConnections.TryAdd(token, claimant);
    }

    /// <summary>
    /// Removes a WebSocket connection from the active connections list. The client token must be valid and the client connected. 
    /// </summary>
    private void RemoveConnection(string clientToken)
    {
        var result = ActiveConnections.TryRemove(clientToken, out _);

        Debug.Assert(result, $"Failed to remove client with ID: {clientToken}");
    }

    /// <summary>
    /// Sends a typed message to a specific client. Returns true if the message was sent successfully, false otherwise.
    /// </summary>
    public async Task<bool> SendMessage(string clientToken, ITypedMessage message)
    {
        var result = ActiveConnections.TryGetValue(clientToken, out var runtimeInfo);

        if (!result || runtimeInfo == null || runtimeInfo.WebSocket == null)
        {
            // The client is not connected
            // May happen after e.g. SignalingService.HandleCloseConnection() is called
            return false;
        }

        var messageBytes = Encoding.UTF8.GetBytes(message.ToJson());

        await runtimeInfo.SendLock.WaitAsync();
        try
        {
            await runtimeInfo.WebSocket.SendAsync(
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
            runtimeInfo.SendLock.Release();
        }
    }

    public async Task HandleConnect(HttpContext context, string? requestedToken)
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
        }

        using var webSocket = await context.WebSockets.AcceptWebSocketAsync(new WebSocketAcceptContext
        {
            KeepAliveInterval = PingInterval,
            KeepAliveTimeout = PongTimeout,
        });
        var (clientToken, client) = await AddConnection(webSocket, context, requestedToken);

        await SendClientTokenAsync(clientToken);

        await RaiseClientConnected(clientToken);

        await ListenForMessages(webSocket, clientToken, client);

        RemoveConnection(clientToken);

        await RaiseClientDisconnected(clientToken);

        client.Closed.SetResult();
    }

    private async Task RaiseClientConnected(string clientToken)
    {
        if (ClientConnected == null)
            return;

        ActiveConnections.TryGetValue(clientToken, out var runtimeInfo);

        var payload = new ClientConnectedEvent
        {
            ClientToken = clientToken,
            RemoteIpAddress = runtimeInfo?.RemoteIpAddress,
            UserAgent = runtimeInfo?.UserAgent
        };

        foreach (var handler in ClientConnected.GetInvocationList().Cast<Func<ClientConnectedEvent, Task>>())
        {
            await handler(payload);
        }
    }

    private async Task RaiseClientDisconnected(string clientToken)
    {
        if (ClientDisconnected == null)
            return;

        foreach (var handler in ClientDisconnected.GetInvocationList().Cast<Func<string, Task>>())
        {
            await handler(clientToken);
        }
    }
    private async Task SendClientTokenAsync(string clientToken)
    {
        var message = new ClientTokenMessage
        {
            ClientToken = clientToken
        };

        await SendMessage(clientToken, message);
    }

    /// <summary>
    /// Continuously listens for messages from the WebSocket connection. If a message is received, it is deserialized and forwarded to typed message listeners. If the message is too large or cannot be deserialized, the connection is closed.
    /// </summary>
    private async Task ListenForMessages(WebSocket webSocket, string clientToken, RuntimeClientInformation client)
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

            client.ReportMessage();

            try
            {
                using var document = JsonDocument.Parse(messageJson);
                var root = document.RootElement;

                // Check if the message has the expected structure
                if (!root.TryGetProperty("type", out var typeElement) ||
                    typeElement.ValueKind != JsonValueKind.String ||
                    !root.TryGetProperty("msg", out var msgElement))
                {
                    // Received message with invalid structure
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
                    await SendMessage(clientToken, new PongMessage());
                    continue;
                }

                ForwardMessageToHandlers(clientToken, messageType, msgElement);
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

    private void CloseConnection(WebSocket webSocket,
        WebSocketCloseStatus closeStatus = WebSocketCloseStatus.NormalClosure)
    {
        webSocket.CloseAsync(closeStatus, null, CancellationToken.None);
    }

    /// <summary>
    /// Registers a handler for a specific message type. 
    /// When messages of the specified type are received, the handler will be invoked.
    /// The handler should not be registered multiple times for the same message type.
    /// </summary>
    private void SubscribeToMessageType(MessageType messageType, MessageHandlerDelegate handler)
    {
        var handlers = MessageHandlers.GetOrAdd(messageType, _ => []);

        lock (handlers)
        {
            Debug.Assert(!handlers.Contains(handler), "Handler already registered for this message type");

            handlers.Add(handler);
        }
    }

    /// <summary>
    /// Registers a strongly-typed handler for a specific message type.
    /// When messages of the specified type are received, the message will be deserialized
    /// to the specified type T before being passed to the handler.
    /// The handler should not be registered multiple times for the same message type.
    /// </summary>
    public void SubscribeToMessageType<T>(MessageType messageType, TypedMessageHandlerDelegate<T> handler)
    {
        Task wrapper(string clientToken, JsonElement messageData)
        {
            try
            {
                // Deserialize the JsonElement to the specified type
                var typedData = messageData.Deserialize<T>();
                if (typedData == null)
                {
                    logger.LogError($"Warning: Failed to deserialize message of type {messageType} to {typeof(T).Name}");
                    return Task.CompletedTask;
                }

                return handler(clientToken, typedData);
            }
            catch (JsonException ex)
            {
                logger.LogError($"Error deserializing message of type {messageType} to {typeof(T).Name}: {ex.Message}");
                return Task.CompletedTask;
            }
        }

        // Register the wrapper with the standard message handling system
        SubscribeToMessageType(messageType, wrapper);
    }

    /// <summary>
    /// Unregisters a handler for a specific message type.
    /// The handler must have been registered previously for the same message type.
    /// </summary>
    public void UnsubscribeFromMessageType(MessageType messageType, MessageHandlerDelegate handler)
    {
        MessageHandlers.TryGetValue(messageType, out var handlers);

        Debug.Assert(handlers != null, $"No handlers registered for message type: {messageType}");

        lock (handlers)
        {
            var result = handlers.Remove(handler);

            Debug.Assert(result, "Handler not found in the list of registered handlers");
        }
    }

    /// <summary>
    /// Forwards a message to all registered handlers for its message type.
    /// </summary>
    private void ForwardMessageToHandlers(string senderClientToken, MessageType messageType, JsonElement messageData)
    {
        if (!MessageHandlers.TryGetValue(messageType, out var handlers))
        {
            // No handlers registered for this message type
            return;
        }

        lock (handlers)
        {
            handlers.ForEach(handler =>
            {
                handler(senderClientToken, messageData);
            });
        }
    }

    public List<string> GetClientTokensForUserId(int userId)
    {
        var clientTokens = new List<string>();

        foreach (var kvp in ActiveConnections)
        {
            if (kvp.Value.UserId == userId)
            {
                clientTokens.Add(kvp.Key);
            }
        }

        return clientTokens;
    }

    public int? GetUserIdForClientToken(string clientToken)
    {
        if (ActiveConnections.TryGetValue(clientToken, out var runtimeInfo))
        {
            return runtimeInfo.UserId;
        }

        return null;
    }

    public bool AreSignedInWithSameAccount(string clientTokenA, string clientTokenB)
    {
        var userIdA = GetUserIdForClientToken(clientTokenA);

        return userIdA != null && userIdA == GetUserIdForClientToken(clientTokenB);
    }

    public string? GetRemoteIpAddressForClientToken(string clientToken)
    {
        return ActiveConnections.TryGetValue(clientToken, out var runtimeInfo) ? runtimeInfo.RemoteIpAddress : null;
    }

    public void SetPublicKey(string clientToken, string publicKey)
    {
        if (ActiveConnections.TryGetValue(clientToken, out var runtimeInfo))
        {
            runtimeInfo.PublicKey = publicKey;
        }
    }

    public string? GetPublicKeyForClientToken(string clientToken)
    {
        return ActiveConnections.TryGetValue(clientToken, out var runtimeInfo) ? runtimeInfo.PublicKey : null;
    }

    public (int SignedIn, int Anonymous) CountClients()
    {
        int signedIn = 0;
        int anonymous = 0;

        foreach (var kvp in ActiveConnections)
        {
            if (kvp.Value.UserId == null)
                anonymous++;
            else
                signedIn++;
        }

        return (signedIn, anonymous);
    }
}