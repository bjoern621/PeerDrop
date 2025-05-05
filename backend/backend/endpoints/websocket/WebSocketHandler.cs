using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.endpoints.websocket;

using MessageType = string;


public struct TypedMessage<T>
{
    [JsonPropertyName("type")]
    public MessageType Type { get; set; }

    [JsonPropertyName("msg")]
    public T Msg { get; set; }
}

public static class WebSocketHandler
{
    public static async Task HandleConnect(HttpContext context)
    {
        if (context.WebSockets.IsWebSocketRequest)
        {
            Console.WriteLine("WebSocket connection accepted.");
            using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
            await ListenForMessages(webSocket);
        }
        else
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
        }
    }

    private static async Task ListenForMessages(WebSocket webSocket)
    {
        var buffer = new byte[1024 * 4];
        TypedMessage<object> typedMessage;

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

            var messageJSON = Encoding.UTF8.GetString(buffer, 0, result.Count);
            Console.WriteLine($"Received message: {messageJSON}");

            try
            {
                typedMessage = JsonSerializer.Deserialize<TypedMessage<object>>(messageJSON);
                Console.WriteLine($"Deserialized Type: {typedMessage.Type}, Msg: {typedMessage.Msg}");
            }
            catch (JsonException ex)
            {
                Console.WriteLine($"Failed to deserialize message: {ex.Message}");
                CloseConnection(webSocket, WebSocketCloseStatus.InvalidPayloadData);
                return;
            }

            Console.WriteLine($"Type: {typedMessage.Type}, Msg: {typedMessage.Msg}");

            // // Example: Echo the message back
            // await webSocket.SendAsync(
            //     new ArraySegment<byte>(buffer, 0, result.Count),
            //     result.MessageType,
            //     result.EndOfMessage,
            //     CancellationToken.None);
        }

        CloseConnection(webSocket);
    }

    private static void CloseConnection(WebSocket webSocket,
        WebSocketCloseStatus closeStatus = WebSocketCloseStatus.NormalClosure)
    {
        webSocket.CloseAsync(closeStatus, null, CancellationToken.None);
        Console.WriteLine("WebSocket connection closed.");
    }
}