using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.LanComponent.Common.Api.DTOs;

/// <summary>
/// Pushed to a client whenever the set of peers in its local network changes.
/// Contains the full current peer list, excluding the recipient itself.
/// </summary>
public class LanPeersMessage : ITypedMessage
{
    public static string TypeString => "lan-peers";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("peers")]
    public required List<LanPeerDTO> Peers { get; set; }
}
