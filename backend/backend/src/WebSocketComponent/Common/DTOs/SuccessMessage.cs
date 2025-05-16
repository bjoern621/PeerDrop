using System.Text.Json.Serialization;

namespace backend.WebSocketComponent.Common.DTOs;

public struct SuccessMessage
{
    [JsonPropertyName("requestID")]
    public string RequestId { get; set; }
    
    [JsonPropertyName("description")]
    public string Description { get; set; }
}