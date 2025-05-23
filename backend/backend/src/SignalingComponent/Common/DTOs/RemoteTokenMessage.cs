using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.DTOs;

namespace backend.SignalingComponent.Common.DTOs;

public class RemoteTokenMessage : ITypedMessage
{
    public static string TypeString => "remote-token";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("requestID")]
    public string? RequestId { get; set; }
    
    [JsonPropertyName("remoteToken")]
    public required string RemoteToken { get; set; }
}