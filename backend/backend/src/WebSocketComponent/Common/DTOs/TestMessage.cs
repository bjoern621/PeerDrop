using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.DTOs;

namespace backend.WebSocketComponent.Common.DTOs;

public class TestMessage : ITypedMessage
{
    public static string TypeString => "test";

    public string InstanceTypeString => TypeString;
    
    [JsonPropertyName("message")]
    public required string Message { get; set; }
}