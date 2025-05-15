using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.SignalingComponent.Common.Datatype;

public struct IceCandidateMessage
{
    
    [JsonPropertyName("remoteToken")]
    
    public string RemoteToken { get; set; }
    
    [JsonPropertyName("iceCandidate")]
    
    public JsonElement IceCandidate { get; set; }
    
}