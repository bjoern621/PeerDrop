using System.Text.Json.Serialization;

namespace backend.WebSocketComponent.Common.DTOs;

public class ErrorMessage : TypedMessage
{
    public override string GetTypeString()
    {
        return "error-message";
    }

    [JsonPropertyName("requestID")]
    public required string RequestId { get; set; }
    
    [JsonPropertyName("description")]
    public required string Description { get; set; }
    
    [JsonPropertyName("expected")]
    public string? Expected { get; set; }
    
    [JsonPropertyName("actual")]
    public string? Actual { get; set; }
}