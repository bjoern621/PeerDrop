using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.ConnectionComponent.Common.Api.DTOs;

public class ConnectionRequestMessage : ITypedMessage
{
    public static string TypeString => "connection-request";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("remoteToken")]
    public required string RemoteToken { get; set; }
}