using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.DTOs.Api;

namespace backend.SignalingComponent.Common.DTOs;

public class ConnectionRequestMessage : ITypedMessage
{
    public static string TypeString => "connection-request";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("remoteToken")]
    public required string RemoteToken { get; set; }
}