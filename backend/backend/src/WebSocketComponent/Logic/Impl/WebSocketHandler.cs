using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using backend.AccountComponent.Logic.Api;
using backend.WebSocketComponent.Common.Api.DTOs;
using backend.WebSocketComponent.Logic.Api;
using backend.WebSocketComponent.Logic.Types;

namespace backend.WebSocketComponent.Logic.Impl;

using MessageType = string;

public class WebSocketHandler(ILogger<WebSocketHandler> logger, IAuthTokenService tokenService) : IWebSocketHandler
{
    private readonly ConcurrentDictionary<string, RuntimeClientInformation> ActiveConnections = new(); // String is the client token
    private readonly Random Random = new();
    private readonly ConcurrentDictionary<MessageType, List<MessageHandlerDelegate>> MessageHandlers = new();

    public bool RemoteTokenExists(string remoteToken)
    {
        return ActiveConnections.ContainsKey(remoteToken);
    }
    private string GenerateClientToken()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789";
        return new string([.. Enumerable.Repeat(chars, 5).Select(s => s[Random.Next(s.Length)])]);
    }

    /// <summary>
    /// Generates a unique client ID and adds the WebSocket connection to the active connections list. Returns the client ID.
    /// </summary>
    private async Task<string> AddConnectionAsync(WebSocket webSocket, HttpContext context)
    {
        int? userId = await tokenService.GetAuthenticatedAccountIdAsync(context);

        var runtimeInformation = new RuntimeClientInformation
        {
            WebSocket = webSocket,
            UserId = userId // User ID from the access token cookie, may be null if not logged in
        };

        string clientToken;
        do
        {
            clientToken = GenerateClientToken();
        } while (!ActiveConnections.TryAdd(clientToken, runtimeInformation));

        return clientToken;
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

        try
        {
            var messageBytes = Encoding.UTF8.GetBytes(message.ToJson());
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
    }

    public async Task HandleConnect(HttpContext context)
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
        }

        using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
        var clientToken = await AddConnectionAsync(webSocket, context);

        await SendClientTokenAsync(clientToken);

        await ListenForMessages(webSocket, clientToken);

        RemoveConnection(clientToken);
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
    private async Task ListenForMessages(WebSocket webSocket, string clientToken)
    {
        var buffer = new byte[1024];

        while (webSocket.State == WebSocketState.Open)
        {
            WebSocketReceiveResult result;
            try
            {
                result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            }
            catch (OperationCanceledException)
            {
                // "The remote party closed the WebSocket connection without completing the close handshake."
                return;
            }
            catch (WebSocketException)
            {
                // "The remote party closed the WebSocket connection without completing the close handshake."
                return;
            }

            if (!result.EndOfMessage)
            {
                CloseConnection(webSocket, WebSocketCloseStatus.MessageTooBig);
                return;
            }

            if (result.MessageType == WebSocketMessageType.Close)
                break;

            var messageJson = Encoding.UTF8.GetString(buffer, 0, result.Count);

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
}