using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.endpoints.websocket;

struct SDPMessage
{
    [JsonPropertyName("remoteToken")]
    
    public string RemoteToken { get; set; }
    
    [JsonPropertyName("description")]
    
    public JsonElement Description { get; set; }
}