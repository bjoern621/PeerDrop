using System.Text.Json.Serialization;

namespace backend.WebSocketComponent.Common.DTOs;

public class SuccessMessage : TypedMessage
{
    public override string GetTypeString()
    {
        return "success-message";
    }

    [JsonPropertyName("requestID")]
    public required string RequestId { get; set; }
    
    [JsonPropertyName("description")]
    public required string Description { get; set; }
}