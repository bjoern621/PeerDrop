using System.Text.Json.Serialization;

namespace backend.SignalingComponent.Common.Datatype;

public struct RemoteTokenMessage
{
    
    [JsonPropertyName("remoteToken")]
    
    public String RemoteToken { get; set; }
    
}