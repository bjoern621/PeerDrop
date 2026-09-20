using System.Text.Json.Serialization;
using backend.WebSocketComponent.Common.Api.DTOs;

namespace backend.ConnectionComponent.Common.Api.DTOs;

/// <summary>
/// Reports that the sending client left the transfer screen after the peer
/// closed the connection. The client counts as available again from here on.
/// Carries no payload.
/// </summary>
public class SessionLeftMessage : ITypedMessage
{
    public static string TypeString => "session-left";

    [JsonIgnore]
    public string InstanceTypeString => TypeString;
}
