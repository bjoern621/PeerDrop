using System.Text.Json.Serialization;
using backend.SignalingComponent.Common.Api.DTOs;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.ConnectionComponent.Common.Api.DTOs;

public class EstablishConnectionMessage : ITypedMessage
{
    public static string TypeString => "establish-connection";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("remoteToken")]
    public required string RemoteToken { get; set; }

    [JsonPropertyName("iceServers")]
    public required IReadOnlyList<IceServer> IceServers { get; set; }
}