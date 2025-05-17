using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.DTOs;

namespace backend.WebSocketComponent.Common.DTOs;

public class TestMessage : TypedMessage
{
    public override string GetTypeString()
    {
        return "test-message";
    }

    [JsonPropertyName("message")]
    public required string Message { get; set; }
}