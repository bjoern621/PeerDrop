using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using backend.Common;
using backend.WebSocketComponent.Common.DTOs;
using backend.WebSocketComponent.Logic.Api;

namespace backend.WebSocketComponent.Logic.Impl;

using MessageType = string;

public class WebSocketHandler : IWebSocketHandler
{
    private static readonly ConcurrentDictionary<string, WebSocket> ActiveConnections = new();
    private static readonly Random Random = new();
    private static readonly ConcurrentDictionary<MessageType, List<MessageHandlerDelegate>> MessageHandlers = new();

    public bool RemoteTokenExists(string remoteToken)
    {
        return ActiveConnections.ContainsKey(remoteToken);
    }
    private static string GenerateClientToken()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789";
        return new string([.. Enumerable.Repeat(chars, 5).Select(s => s[Random.Next(s.Length)])]);
    }

    /// <summary>
    /// Generates a unique client ID and adds the WebSocket connection to the active connections list. Returns the client ID.
    /// </summary>
    private static string AddConnection(WebSocket webSocket)
    {
        string clientToken;
        do
        {
            clientToken = GenerateClientToken();
        } while (!ActiveConnections.TryAdd(clientToken, webSocket));

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
    /// Sends a typed message to a specific client. The client ID must be valid and connected. Returns true if the message was sent successfully, false otherwise.
    /// </summary>
    public async Task<bool> SendMessage<T>(string clientToken, TypedMessage<T> message)
    {
        var result = ActiveConnections.TryGetValue(clientToken, out var webSocket);

        Debug.Assert(result, $"Failed to find client with ID: {clientToken}");
        Debug.Assert(webSocket != null);

        try
        {
            var messageJson = JsonSerializer.Serialize(message);
            var messageBytes = Encoding.UTF8.GetBytes(messageJson);
            await webSocket.SendAsync(
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
        var clientToken = AddConnection(webSocket);

        await SendClientTokenAsync(clientToken);

        await ListenForMessages(webSocket, clientToken);

        RemoveConnection(clientToken);
    }

    const string CLIENT_TOKEN_MESSAGE_TYPE = "client-token";

    struct ClientTokenMessage
    {
        [JsonPropertyName("token")]
        public string ClientToken { get; set; }
    }

    private async Task SendClientTokenAsync(string clientToken)
    {
        TypedMessage<ClientTokenMessage> message = new()
        {
            Type = CLIENT_TOKEN_MESSAGE_TYPE,
            Msg = new ClientTokenMessage
            {
                ClientToken = clientToken
            }
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
            var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);

            if (!result.EndOfMessage)
            {
                CloseConnection(webSocket, WebSocketCloseStatus.MessageTooBig);
                return;
            }

            if (result.MessageType == WebSocketMessageType.Close)
                break;

            var messageJson = Encoding.UTF8.GetString(buffer, 0, result.Count);
            // Console.WriteLine($"Received message from {clientToken}: {messageJson}");

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
                    Console.WriteLine($"Warning: Failed to deserialize message of type {messageType} to {typeof(T).Name}");
                    return Task.CompletedTask;

                }

                return handler(clientToken, typedData);
            }
            catch (JsonException ex)
            {
                Console.WriteLine($"Error deserializing message of type {messageType} to {typeof(T).Name}: {ex.Message}");
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
}