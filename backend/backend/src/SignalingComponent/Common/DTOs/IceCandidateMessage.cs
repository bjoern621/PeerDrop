using System.Text.Json;
using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.DTOs;

namespace backend.SignalingComponent.Common.DTOs;

public class IceCandidateMessage : ITypedMessage
{
    public static string TypeString => "ice-candidate";

    public string InstanceTypeString => TypeString;

    [JsonPropertyName("remoteToken")]
        public required string RemoteToken { get; set; }
    
    [JsonPropertyName("iceCandidate")]
    public JsonElement IceCandidate { get; set; }
    
}