using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.endpoints.websocket;

struct IceCandidateMessage
{
    
    [JsonPropertyName("remoteToken")]
    
    public string RemoteToken { get; set; }
    
    [JsonPropertyName("iceCandidate")]
    
    public JsonElement IceCandidate { get; set; }
    
}