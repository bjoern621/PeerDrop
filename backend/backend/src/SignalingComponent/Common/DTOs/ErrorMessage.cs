using System.Text.Json.Serialization;

namespace backend.WebSocketComponent.Common.DTOs;

public class ErrorMessage : ITypedMessage
{
    public static string TypeString => "error";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("requestID")]
    public required string RequestId { get; set; }
    
    [JsonPropertyName("description")]
    public required string Description { get; set; }
    
    [JsonPropertyName("expected")]
    public string? Expected { get; set; }
    
    [JsonPropertyName("actual")]
    public string? Actual { get; set; }
}