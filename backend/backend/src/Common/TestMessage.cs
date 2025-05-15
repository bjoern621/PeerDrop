using System.Text.Json.Serialization;

namespace backend.Common;

public struct TestMessage
{
    [JsonPropertyName("message")]
    public string Message { get; set; }
}