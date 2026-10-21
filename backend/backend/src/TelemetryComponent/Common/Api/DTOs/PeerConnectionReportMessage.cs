using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.TelemetryComponent.Common.Api.DTOs;

/// <summary>
/// Sent by one of the two peers once its WebRTC connection connects or fails.
/// </summary>
public class PeerConnectionReportMessage : ITypedMessage
{
    public static string TypeString => "peer-connection-report";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    /// <summary>
    /// "connected" or "failed".
    /// </summary>
    [JsonPropertyName("outcome")]
    public required string Outcome { get; set; }

    /// <summary>
    /// "host", "reflexive" or "relay". Null when no candidate pair was selected.
    /// </summary>
    [JsonPropertyName("route")]
    public string? Route { get; set; }

    /// <summary>
    /// Milliseconds from creating the peer connection to the outcome.
    /// </summary>
    [JsonPropertyName("setupMs")]
    public required double SetupMs { get; set; }
}
