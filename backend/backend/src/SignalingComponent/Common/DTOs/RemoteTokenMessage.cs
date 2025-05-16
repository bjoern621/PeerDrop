using System.Text.Json.Serialization;

namespace backend.SignalingComponent.Common.DTOs;

public struct RemoteTokenMessage
{
    [JsonPropertyName("requestID")]
    public string? RequestId { get; set; }
    
    [JsonPropertyName("remoteToken")]
    public String RemoteToken { get; set; }
}