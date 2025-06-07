using System.Text.Json.Serialization;

namespace backend.WebSocketComponent.Common.Api.DTOs;

public class TestMessage : ITypedMessage
{
    public static string TypeString => "test";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("message")]
    public required string Message { get; set; }
}