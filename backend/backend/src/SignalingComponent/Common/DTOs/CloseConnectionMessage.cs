using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.DTOs;

namespace backend.SignalingComponent.Common.DTOs;

public class CloseConnectionMessage : ITypedMessage
{
    public static string TypeString => "close-connection";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("requestID")]
    public string? RequestId { get; set; }
    
    [JsonPropertyName("remoteToken")]
    public required string RemoteToken { get; set; }
}