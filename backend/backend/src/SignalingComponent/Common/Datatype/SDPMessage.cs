using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.SignalingComponent.Common.Datatype;

public struct SdpMessage
{
    [JsonPropertyName("remoteToken")]
    
    public string RemoteToken { get; set; }
    
    [JsonPropertyName("description")]
    
    public JsonElement Description { get; set; }
}