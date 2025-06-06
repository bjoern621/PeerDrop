using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.SignalingComponent.Common.Api.DTOs;

public class ConnectionResponseMessage : ITypedMessage
{
    public static string TypeString => "connection-response";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("accepted")]
    public bool Accepted { get; set; }

    [JsonPropertyName("remoteToken")]
    public required string RemoteToken { get; set; }
}