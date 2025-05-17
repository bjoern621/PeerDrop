using System.Text.Json.Serialization;

namespace backend.WebSocketComponent.Common.DTOs;

public class SuccessMessage : ITypedMessage
{
    public static string TypeString => "success";

    public string InstanceTypeString => TypeString;

    [JsonPropertyName("requestID")]
    public required string RequestId { get; set; }
    
    [JsonPropertyName("description")]
    public required string Description { get; set; }
}