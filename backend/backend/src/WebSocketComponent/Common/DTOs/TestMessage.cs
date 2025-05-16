using System.Text.Json.Serialization;

namespace backend.WebSocketComponent.Common.DTOs;

public struct TestMessage
{
    [JsonPropertyName("message")]
    public string Message { get; set; }
}