using System.Text.Json.Serialization;

namespace backend.endpoints.websocket;

public struct SuccessMessage
{
    [JsonPropertyName("description")]
    public string Description { get; set; }
}