using System.Text.Json.Serialization;

namespace backend.WebSocketComponent.Common.Api.DTOs;

public class ClientTokenMessage : ITypedMessage
{
    public static string TypeString => "client-token";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("token")]
    public required string ClientToken { get; set; }
}