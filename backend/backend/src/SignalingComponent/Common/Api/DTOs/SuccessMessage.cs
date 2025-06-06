using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.SignalingComponent.Common.Api.DTOs;

public class SuccessMessage : ITypedMessage
{
    public static string TypeString => "success";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("requestID")]
    public required string RequestId { get; set; }

    [JsonPropertyName("description")]
    public required string Description { get; set; }
}