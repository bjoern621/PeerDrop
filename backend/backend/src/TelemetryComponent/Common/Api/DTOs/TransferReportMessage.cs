using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.TelemetryComponent.Common.Api.DTOs;

/// <summary>
/// Sent by the sending peer once a file transfer ends.
/// </summary>
public class TransferReportMessage : ITypedMessage
{
    public static string TypeString => "transfer-report";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    /// <summary>
    /// "completed" or "failed".
    /// </summary>
    [JsonPropertyName("outcome")]
    public required string Outcome { get; set; }

    /// <summary>
    /// "host", "reflexive" or "relay". Null when no candidate pair was selected.
    /// </summary>
    [JsonPropertyName("route")]
    public string? Route { get; set; }

    /// <summary>
    /// Bytes that left the sender for this file.
    /// </summary>
    [JsonPropertyName("bytes")]
    public required long Bytes { get; set; }
}
