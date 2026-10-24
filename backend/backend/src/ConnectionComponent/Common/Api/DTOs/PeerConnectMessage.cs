using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.ConnectionComponent.Common.Api.DTOs;

/// <summary>
/// Asks for a peer connection to a client that accepted an offer before, or to an own device.
/// </summary>
public class PeerConnectMessage : ITypedMessage
{
    public static string TypeString => "peer-connect";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("to")]
    public required string To { get; set; }
}
