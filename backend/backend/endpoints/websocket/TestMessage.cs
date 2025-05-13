using System.Text.Json.Serialization;

namespace backend.endpoints.websocket;

public struct TestMessage
{
    [JsonPropertyName("message")]
    public string Message { get; set; }
}