using System.Text.Json.Serialization;

namespace backend.WebSocketComponent.Common.DTOs;

public struct SuccessMessage
{
    [JsonPropertyName("description")]
    public string Description { get; set; }
}