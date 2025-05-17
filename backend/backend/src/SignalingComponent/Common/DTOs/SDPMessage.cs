using System.Text.Json;
using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.DTOs;

namespace backend.SignalingComponent.Common.DTOs;

public class SdpMessage : TypedMessage
{
    public override string GetTypeString()
    {
        return "sdp-message";
    }
    
    [JsonPropertyName("remoteToken")]
    
    public required string RemoteToken { get; set; }
    
    [JsonPropertyName("description")]
    
    public JsonElement Description { get; set; }
}