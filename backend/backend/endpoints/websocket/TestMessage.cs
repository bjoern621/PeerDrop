using System.Text.Json.Serialization;

namespace backend.endpoints.websocket;

public struct TestMessage
{
    [JsonPropertyName("nachricht")]
    public string Message { get; set; }
}