using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.ConnectionComponent.Common.Api.DTOs;

/// <summary>
/// Full snapshot of a client's connection-request state, pushed by the server
/// whenever the state changes. The client renders its UI from the latest
/// snapshot instead of tracking individual request events.
/// </summary>
public class ConnectionStateMessage : ITypedMessage
{
    public static string TypeString => "connection-state";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;

    /// <summary>
    /// Token of the peer the client's own pending request is addressed to, or null if none.
    /// </summary>
    [JsonPropertyName("outgoingRequestTarget")]
    public required string? OutgoingRequestTarget { get; set; }

    /// <summary>
    /// Tokens of peers with a pending request addressed to the client.
    /// </summary>
    [JsonPropertyName("incomingRequesters")]
    public required List<string> IncomingRequesters { get; set; }
}
