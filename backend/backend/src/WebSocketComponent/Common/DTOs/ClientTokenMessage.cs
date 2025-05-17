using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.DTOs;

public class ClientTokenMessage : TypedMessage
{
    public override string GetTypeString()
    {
        return "client-token";
    }

    [JsonPropertyName("token")]
    public required string ClientToken { get; set; }
}