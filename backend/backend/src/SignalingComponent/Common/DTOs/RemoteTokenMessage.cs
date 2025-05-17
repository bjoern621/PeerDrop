using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.DTOs;

namespace backend.SignalingComponent.Common.DTOs;

public class RemoteTokenMessage : TypedMessage
{
    public override string GetTypeString()
    {
        return "remote-token-message";
    }

    [JsonPropertyName("requestID")]
    public string? RequestId { get; set; }
    
    [JsonPropertyName("remoteToken")]
    public required string RemoteToken { get; set; }
}