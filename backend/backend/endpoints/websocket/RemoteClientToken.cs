using System.Text.Json.Serialization;

namespace backend.endpoints.websocket;

public struct RemoteClientToken
{
    
    [JsonPropertyName("remote-token")]
    
    public String RemoteToken { get; set; }
    
}