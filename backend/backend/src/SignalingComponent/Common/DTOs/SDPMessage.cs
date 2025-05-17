using System.Text.Json;
using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.DTOs;

namespace backend.SignalingComponent.Common.DTOs;

public class SdpMessage : ITypedMessage
{
    public static string TypeString => "sdp";

    public string InstanceTypeString => TypeString;
    
    [JsonPropertyName("remoteToken")]
    
    public required string RemoteToken { get; set; }
    
    [JsonPropertyName("description")]
    
    public JsonElement Description { get; set; }
}