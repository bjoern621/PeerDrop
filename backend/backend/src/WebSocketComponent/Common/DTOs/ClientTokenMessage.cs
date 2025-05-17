using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.DTOs;

public class ClientTokenMessage : ITypedMessage
{
    public static string TypeString => "client-token";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("token")]
    public required string ClientToken { get; set; }
}