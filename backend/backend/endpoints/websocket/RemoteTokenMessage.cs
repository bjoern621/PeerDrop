using System.Text.Json.Serialization;

namespace backend.endpoints.websocket;

public struct RemoteTokenMessage
{
    
    [JsonPropertyName("remoteToken")]
    
    public String RemoteToken { get; set; }
    
}