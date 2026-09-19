using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.LanComponent.Common.Api.DTOs;

/// <summary>
/// Announces whether the sending client takes part in LAN discovery.
/// A client with discovery switched off receives no peer list and appears in no other client's list.
/// A connection starts out switched off, so a client is discoverable from its own report onwards.
/// </summary>
public class LanDiscoveryStateMessage : ITypedMessage
{
    public static string TypeString => "lan-discovery-state";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    [JsonPropertyName("enabled")]
    public required bool Enabled { get; set; }
}
